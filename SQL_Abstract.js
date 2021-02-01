// Project: Sql Abstract
// Author: Adam Orczyk
// Last modified: 2020-07-28

/**
 * Returns SqlAbstract object.
 *
 * Usage:
 * 
 * var sql = new SqlAbstract();
 * 
 * var sql = new SqlAbstract({
 *   spreadsheets: [SpreadsheetUrl]
 * });
 * 
 * var sql = new SqlAbstract({
 *   spreadsheets: [
 *     {
 *       url: SpreadsheetUrl,
 *       tables: {
 *         'Sheet Name': {
 *           as: 'Table name',
 *           serializer: {
 *             'Column 1': { // for JSON
 *               get: JSON.parse,
 *               set: JSON.stringify
 *             },
 *             'Column 2': { // for date
 *               get: function (x) {
 *                 return Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   ]
 * });
 * 
 * Methods:
 * - createDB
 * 
 *   sql.createDB({
 *     spreadsheet: SpreadsheetUrl,
 *     tables: [
 *       {
 *         name: 'Sheet name',
 *         as: 'Table name',
 *         columns: ['C1', 'C2', 'C3']
 *       }
 *     ]
 *   })
 * 
 * - createTable
 * 
 *   sql.createTable({
 *     spreadsheet: SpreadsheetUrl,
 *     table: {
 *       name: 'Sheet name',
 *       as: 'Table name',
 *       columns: ['C1', 'C2', 'C3']
 *     }
 *   });
 * 
 * - dropTable
 * 
 *   sql.dropTable({table: 'Table1'});
 * 
 * - initTable
 * 
 *   sql.initTable({table: 'Table1', values: [[1, 'init', 1],[1, 'init', 1]]});
 * 
 * - select
 * 
 *   sql.select({table: 'Table1', where:{'C2': 'init'}})
 * 
 * - insert
 * 
 *   sql.insert({table: 'Table1', values: {'C1': 1, 'C2': 'insert', 'C3': 2}})
 * 
 *   sql.insert({table: 'Update', values:[{'K1': 'a', 'K2': 'Null'},{'K1': 'b', 'K2': 'Null'}]});
 * 
 *   sql.insert({table: 'Table1', values: [[1, 'insert multiple', 3],[1, 'insert multiple', 3]]});
 * 
 * - update
 * 
 *   sql.update({table: 'Update', where:{'K1': 'a'}, set:{'K2': 'Test1'}});
 * 
 * - updateRow
 * 
 *   sql.updateRow({table: 'Update', rowNr: 4, values: {'K2': 'updateRow'}})
 * 
 * - getTable
 * 
 *   var table = sql.getTable({table: 'Update'});
 * 
 *   table.sheet - Sheet handler
 * 
 *   ex. table.sheet.getDataRange().getDisplayValues()
 */
function SqlAbstract(params) {
  var tables = {};

  if (params && 'spreadsheets' in params) {
    for (var n in params.spreadsheets) {
      var url;
      var spreadsheet;

      if (isString(params.spreadsheets[n])) {
        url = params.spreadsheets[n];
      } else if (isObject(params.spreadsheets[n])) {
        spreadsheet = params.spreadsheets[n];
        url = spreadsheet.url;
      } else {
        throw "Wrong spreadsheet declaration!";
      }

      var ss = SpreadsheetApp.openByUrl(url);

      var sheets = ss.getSheets();

      for (var i in sheets) {
        var sheet = sheets[i];
        var sheetName = sheet.getName();
        var tableKey = sheetName;

        if (spreadsheet && 'tables' in spreadsheet) {
          if (!(sheetName in spreadsheet.tables)) {
            continue;
          }

          if ('as' in spreadsheet.tables[sheetName]) {
            tableKey = spreadsheet.tables[sheetName].as;
          }
        }

        if (!(tableKey in tables)) {
          tables[tableKey] = {
            sheet: sheet,
            sheetName: sheetName,
            ss: ss,
            url: url
          };

          if (spreadsheet && 'tables' in spreadsheet && spreadsheet.tables[sheetName] && 'serializer' in spreadsheet.tables[sheetName]) {
            tables[tableKey].serializer = spreadsheet.tables[sheetName].serializer;
          }
        } else {
          throw Utilities.formatString("Table '%s' already exists!", sheetName);
        }
      }
    }
  }

  if (params && 'sheets' in params) {
    for (var i in params.sheets) {
      var sheet = params.sheets[i];
      tables[sheet.getName()] = {
        sheet: sheet
      };
    }
  }

  var getTable = function (opt, force) {
    var table;
    var tableKey;

    if ('table' in opt) {
      tableKey = opt.table;

      if (tableKey in tables) {
        table = tables[tableKey];

        // HACK
        opt.sheet = table.sheet;
      }

    } else if ('sheet' in opt) {
      var sheet = opt.sheet;

      if ('as' in opt) {
        tableKey = opt.as;
      } else {
        tableKey = sheet.getName();
      }

      if (!(tableKey in tables)) {
        table = {
          sheet: sheet
        };
        tables[tableKey] = table;
      } else {
        table = tables[tableKey];
      }
    }

    if (!table && !force) throw Utilities.formatString("Table '%s' not exists!", tableKey);

    return table;
  };


  cache = {};

  var getSheetKey = function (sheet) {
    // 1ms
    var keyData = {
      spreadsheetId: sheet.getParent().getId(),
      sheetName: sheet.getSheetName(),
    };

    var key = structure2string(keyData);

    return key;
  }

  var getCachedRows = function (sheet) {
    var data;

    var key = getSheetKey(sheet);

    var time = new Date().getTime();

    var data = null;

    if (cache[key]) {
      // ToDo: Sprawdza czy dane są aktulane - odpytanie arkusza o czas ostatniej zmiany
      data = cache[key].data;
      cache[key].getTime = time;
    }

    return data
  }

  var getColumnIdMapping = function (table) {
    if ('columnIdByName' in table) {
      return table.columnIdByName;
    } else {
      var headers = table.sheet.getRange(1, 1, 1, table.sheet.getLastColumn()).getDisplayValues().shift();

      table.columnIdByName = getColumnIdByName(headers);

      return table.columnIdByName;
    }
  }

  this.getTable = function (opt) {
    try {
      return getTable(opt);
    } catch (e) {
      throw e;
    }
  }

  this.select = function (opt) {
    try {
      var table = getTable(opt);
      var sheet = table.sheet;
    } catch (e) {
      throw e;
    }

    var cachedRows = getCachedRows(sheet);

    if (cachedRows) {
      data = cachedRows;
    } else {
      if (params && params.debug) console.time('dataLoaded');
      data = sheet.getDataRange().getValues();
      if (params && params.debug) console.timeEnd('dataLoaded');

      var key = getSheetKey(sheet);
      var time = new Date().getTime();

      cache[key] = {
        data: data,
        loadTime: time,
        getTime: time,
      };
    }

    if ('serializer' in table) {
      opt.serializer = table.serializer;
    }

    if (params && params.debug) console.time('dataProcessed');
    var out = select(opt, data);
    if (params && params.debug) console.timeEnd('dataProcessed');

    return out;
  };


  this.update = function (opt) {
    var out = this.select(opt);

    for (var n in out) {
      out[n].set(opt.set);
    }

    return out;
  }

  this.updateRow = function (opt) {
    try {
      var table = getTable(opt);
      var sheet = table.sheet;
    } catch (e) {
      throw e;
    }

    var cachedRows = getCachedRows(sheet);

    return updateRow(sheet, opt.rowNr, opt.values, cachedRows, getColumnIdMapping(table));
  }


  this.insert = function (opt) {
    try {
      var table = getTable(opt);
      var sheet = table.sheet;
    } catch (e) {
      throw e;
    }

    var serialize = function(values){
      Logger.log('serialize');
      if ('serializer' in table){
        Logger.log('serialize found');
        if (isObject(values)){
          Logger.log('serializeing');
          for (var colName in table.serializer){
            if ('set' in table.serializer[colName] && colName in values){
              values[colName] = table.serializer[colName].set(values[colName]);
            }
          }
        }
      }

      return values;
    }

    var cachedRows = getCachedRows(sheet);

    Logger.log('insert');
    
    if (isObject(opt.values)) {
      Logger.log('inser object');
      appendRow(sheet, serialize(opt.values), cachedRows, getColumnIdMapping(table));
    } else if (isArray(opt.values)) {
      for (var n in opt.values) {
        var row = opt.values[n];

        if (isArray(row)) {
          sheet.appendRow(row);

          if (cachedRows) {
            cachedRows.push(row);
          }
        } else if (isObject(row)) {
          appendRow(sheet, serialize(row), cachedRows);
        } else {
          throw "Insert data is invalid!"
        }
      }
    } else {
      throw "Inser data is invalid!"
    }

    return true;
  }

  this.initTable = function (opt) {
    try {
      var table = getTable(opt);
      var sheet = table.sheet;
    } catch (e) {
      throw e;
    }

    if (isArray(opt.values)) {
      if (isArray(opt.values[0])) {
        sheet.getRange(sheet.getLastRow() + 1, 1, opt.values.length, opt.values[0].length).setValues(opt.values);
      }
    } else {
      return false;
    }

    return true;
  }

  this.createTable = function (opt) {
    var ss;

    if ('spreadsheet' in opt) {
      var url = opt.spreadsheet;
      ss = SpreadsheetApp.openByUrl(url);
    } else {
      ss = opt.ss;
    }

    var table = opt.table;

    if (!isObject(table)) throw "Table should be an object!";

    var tableKey = table.name;

    if ('as' in table) {
      tableKey = table.as;
    }

    if (!(tableKey in tables)) {
      var sheet = ss.getSheetByName(table.name);
      if (!sheet) {
        sheet = ss.insertSheet(table.name);

        sheet.appendRow(table.columns);
        sheet.deleteColumns(table.columns.length + 1, sheet.getMaxColumns() - table.columns.length);
        sheet.deleteRows(2, sheet.getMaxRows() - 1);
      }

      tables[tableKey] = {
        sheet: sheet
      };

      if ('serializer' in table) {
        tables[tableKey].serializer = table.serializer;
      }
    } else {
      //      throw Utilities.formatString("Table '%s' already exists!", sheetName);
      return false;
    }

    return true;
  }

  this.createDB = function (opt) {
    var ss = null;

    if ('spreadsheet' in opt) {
      var url = opt.spreadsheet;
      ss = SpreadsheetApp.openByUrl(url);
    } else {
      var name = opt.name;

      if (!name) {
        name = 'DataBase - ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

        ss = SpreadsheetApp.create(name);
      }
    }

    //    var sheets = ss.getSheets();
    //    
    //    for (var n in sheets){
    //      var sheet = sheets[n];
    //      tables[sheet.getName()] = sheet;
    //    }

    for (var n in opt.tables) {
      var table = opt.tables[n];
      this.createTable({
        ss: ss,
        table: table
      });
    }
  }

  this.dropTable = function (opt) {
    try {
      var table = getTable(opt, true);
    } catch (e) {
      throw e;
    }

    if (table) {
      if ('table' in opt) {
        delete tables[opt.table];
      } else if ('sheet' in opt) {
        delete tables[table.sheet.getName()];
      }

      sheet.getParent().deleteSheet(table.sheet);
    }
  }
}


/**
 * Returns selected rows from given sheet.
 *
 * Usage: select({sheet: sheet, where: {}, groupBy: [], orderBy: []})
 *
 * @return {array} returns selected rows as two dimensional array
 */
function select(opt, data) {
  return selectData(opt.sheet, opt.where, opt.groupBy, opt.orderBy, opt.columns, opt.serializer, data);
}

/**
 * Returns selected rows from given sheet.
 * 
 * Loading data from sheet by method getValues.
 *
 * Usage: selectData(sheet, where, [groupBy], [orderBy], [fields])
 *
 * @param {handler} sheet the spreadsheet's sheet handler.
 * @param {object} where the where clause, like in Perl SQL::Abstract (https://metacpan.org/pod/SQL::Abstract)
 *   ex. ("K1","K2", ... are column's headers):
 *   1. {'K1': 'd12', 'K2': {'>=': 1}, 'K3': {'!=': ['b','c']}}
 *   2. {'-or': {'K1': 'd12', '-and': {'K2': 4, 'K3': 4}}}
 *   3. {'K6': /str_\d+/}
 *   "where" can be also compare function like function parameter in "filter" or "sort" functions
 *   ex.:
 *   function(row){return row['K1'] == 'd15'}
 * @param {array} groupBy the list of columns for grouping ex. ['K1','K2'] first groups by column 'K1' next 'K2' returning structure: {'K1_values': {'K2_values': [...rows...]}}.
 * @param {array} orderBy the list of columns for sorting ex. {'K1': 'asc', 'K2': 'desc'} - sorts response by given columns.
 * @return {array} returns selected rows as array of objects
 *
 * Function returns array of objects.
 * Row object methods:
 * - get([columnName]) - when column name is given, returns data from given column in row. Otherwise returns all row as hash, where keys are column's hearers.
 * - set({columnName: value}) - set value for given column. You can set more then one value.
 * - data - return row as simple array
 * Row object properties:
 * - data - row as array
 * - rowNr - number of current row
 * 
 * Duplicated header name handling.
 * When in columns headers there is duplicated column name, it's name should be called with adding it's occurrence number after the name ex.:
 * Headers: 'K1','K2','K3','K2','K2'.
 * Second 'K2' is called 'K2_2', third K2_3' and so on.
 * Ex. where clause, searching on second column 'K2': {'K2_2': 10}
 */
function selectData(sheet, where, groupBy, orderBy, fields, serializer, data) {
  return selectData_(sheet, where, groupBy, orderBy, false, fields, serializer, data);
}


/**
 * Returns selected rows from given sheet.
 *
 * Usage: selectDataRows(sheet, where, [groupBy], [orderBy], [columns])
 *
 * @return {array} returns selected rows as two dimensional array
 */
function selectDataRows(sheet, where, groupBy, orderBy, fields) {
  return selectData_(sheet, where, groupBy, orderBy, 'simple', fields);
}

// Main function
function selectData_(sheet, where, groupBy, orderBy, responseType, fields, serializer, data) {
  // --- Functions needed ---
  // hashify, extractColumnsFromWhere, checkLogicGroups
  // ------------------------

  // getDataRange - runTime: 302 ms
  // getDisplayValues - runTime: 861 ms

  if (!sheet) {
    throw 'ERROR: Parameters "sheet" is needed!';
  }

  if (groupBy && !(typeof groupBy === 'object' && groupBy.constructor === Array)) {
    throw 'ERROR: Parameters "groupBy" should be Array!';
  }

  if (groupBy && groupBy.length == 0) {
    groupBy = undefined;
  }

  // Measuring request time 1
  var _ts1ms = new Date().getTime();

  // Reusing previously got data
  if (!data) {
    data = sheet.getDataRange().getValues(); // runTime: 861 ms
  }

  //  var headers = data.shift();
  var headers = data[0];

  var columnIdByName = getColumnIdByName(headers);

  // Checking if fields there are in table.
  if (fields && fields.length) {
    for (var n in fields) {
      var name = fields[n];

      if (columnIdByName[name] == undefined) {
        throw 'Column name "' + name + '" not exists!';
      }
    }
  }

  var _ts3ms = new Date().getTime();

  // --- Preparing data filter function ---

  var filterFunction = function (row) {return true;};

  if (where){
    if (typeof where !== 'function') {
      filterFunction = getFilterFunction(columnIdByName, where);
    } else {
      filterFunction = function (xrow) {
        return where(hashify(xrow, headers));
      }
    }
  }

  // --- Preparing response ---

  var response = [];
  var responseGrouped = {};
  
  var dataLength = data.length;
  
  for (var n = 1; n < dataLength; n++) {
    var rowData = data[n];

    if (fields && fields.length) {
      rowData = filterFields(rowData, fields, columnIdByName);
    }

    if (filterFunction(rowData)) {
      var row = rowData;

      if (responseType != 'simple') {
        row = {
          id: n,
          rowNr: n + 1,
          data: rowData,
          row: rowData,
          values: function (){return this.get()},
          columnIdByName: columnIdByName,
          serializer: serializer,
          headers: headers,
          sheet: sheet,
          get: getColumnValue,
          set: setColumnValue,
        };
      }

      if (groupBy) {

        var handler = responseGrouped;

        for (var l in groupBy) {
          var key = rowData[columnIdByName[groupBy[l]]];

          if (!handler[key]) {
            handler[key] = [];
          }
          handler = handler[key];
        }
        handler.push(row);
      } else {
        response.push(row);
      }
    }
  }

  // Measuring request time 2
  var _ts2ms = new Date().getTime();
  Logger.log(Utilities.formatString("%d rows in set (%.2f sec) (load: %.2f sec, process: %.2f sec)", response.length, (_ts2ms - _ts1ms) / 1000, (_ts3ms - _ts1ms) / 1000, (_ts2ms - _ts3ms) / 1000));

  if (groupBy) {
    if (orderBy) {
      groupedDataMap(responseGrouped, function (nod) {
        orderByColumns(nod, orderBy)
      });
    }

    return responseGrouped;
  } else {
    if (orderBy) {
      if (responseType == 'simple') {
        orderByColumnsSimple(response, columnIdByName, orderBy);
      } else {
        orderByColumns(response, orderBy);
      }
    }

    return response;
  }
}


function getColumnValue(colName) {
  if (colName) {
    if (this.serializer && colName in this.serializer && 'get' in this.serializer[colName]) {
      return this.serializer[colName].get(this.data[this.columnIdByName[colName]]);
    } else {
      return this.data[this.columnIdByName[colName]];
    }
  } else {
    var hash = hashify(this.data, this.headers);
    
    if (this.serializer) {
      for (var colName in hash) {
        if (colName in this.serializer && 'get' in this.serializer[colName]) {
          hash[colName] = this.serializer[colName].get(hash[colName]);
        }
      }
    }
    
    return hash;
  }
}


function setColumnValue(changes) {
  for (var colName in changes) {
    if (!(colName in this.columnIdByName)) {
      throw "Set - wrong column name '" + colName + "'";
    }
    
    var colValue = changes[colName];
    
    // Serialize
    if (this.serializer && colName in this.serializer && 'set' in this.serializer[colName]) {
      colValue = this.serializer[colName].set(colValue);
    }
    
    this.sheet.getRange(this.rowNr, this.columnIdByName[colName] + 1).setValue(colValue);
    this.data[this.columnIdByName[colName]] = colValue;
  }
  return this;
}

function filterFields(row, fields, columnIdByName) {
  var out = [];

  for (var n in fields) {
    var name = fields[n];
    var value = row[columnIdByName[name]];

    out.push(value);
  }
  return out;
}


// Returns filter function from given where clause.
function getFilterFunction(columnIdByName, where) {
  var check = {};

  var whereColumns = extractColumnsFromWhere_(where);

  for (var name in whereColumns) {
    (function () {
      var condition = whereColumns[name];
      //var condValue = whereColumns[name];

      var comp = getComparisonFunction_(condition, function (a, b) {
        return a == b;
      });

      check[name] = function (value) {
        return comp(value);
      };
    })();
  }

  return function (row) {
    var conditions = {};
    for (var name in check) {
      conditions[name] = check[name](row[columnIdByName[name]]);
    }
    return checkLogicGroups_(where, conditions);
  };
}

// Applying function on all leafs (Arrays) from grouped structure
function groupedDataMap(parentNod, func) {
  var walker = function (nod) {
    if (nod && typeof nod === 'object' && nod.constructor === Object) {
      for (var key in nod) {
        walker(nod[key]);
      }
    } else {
      func(nod);
    }
  }

  walker(parentNod);

  return parentNod;
}

// Sorts data by given columns.
function orderByColumns(data, columns) {
  data.sort(function (a, b) {
    for (var key in columns) {
      var dirValue = undefined;
      var dir = columns[key];

      if (dir == 'asc') {
        dirValue = 1;
      }
      if (dir == 'desc') {
        dirValue = -1;
      }

      if (!dirValue) {
        throw "Wrong order by direction mode!";
      }

      if (a.get(key) < b.get(key)) {
        return -1 * dirValue;
      }
      if (a.get(key) > b.get(key)) {
        return 1 * dirValue;
      }
    }
    return 0;
  });
}

// Sorts data (rows as Arrays) by given columns.
function orderByColumnsSimple(data, columnIdByName, columns) {
  data.sort(function (a, b) {
    for (var n in columns) {
      var key = columnIdByName[columns[n]];
      if (a[key] < b[key]) {
        return -1;
      }
      if (a[key] > b[key]) {
        return 1;
      }
    }
    return 0;
  });
}

// Returns columns headers id mapping.
function getColumnIdByName(headers) {
  var columnIdByName = {};
  var occurrences = {};
  for (var n in headers) {
    var columnName = headers[n];
    if (occurrences[columnName] != undefined) {
      occurrences[columnName]++;
      columnName = columnName + '_' + occurrences[columnName];
    } else {
      occurrences[columnName] = 1;
    }
    columnIdByName[columnName] = Number(n);
  }

  return columnIdByName;
}

// Uses only in selectData.
// Extracts contitions for each column from where.
function extractColumnsFromWhere_(where) {
  var flattenedWhere = {};

  if (typeof where == 'object' && where.constructor === Object) {
    for (var name in where) {
      if (name == '-or' || name == '-and') {
        var part = extractColumnsFromWhere_(where[name]);
        for (var key in part) {
          flattenedWhere[key] = part[key];
        }
      } else {
        flattenedWhere[name] = where[name];
      }
    }
  } else {
    for (var n in where) {
      var part = extractColumnsFromWhere_(where[n]);
      for (var key in part) {
        flattenedWhere[key] = part[key];
      }
    }
  }

  return flattenedWhere;
}


// Uses only in selectData.
// Checking logic expression in where
function checkLogicGroups_(where, data, parentOperator) {
  if (!parentOperator) {
    parentOperator = '-and';
  }
  var ok = parentOperator == '-and' ? true : false;

  if (typeof where == 'object' && where.constructor === Object) {
    for (var name in where) {
      var lv = undefined;
      if (name == '-or' || name == '-and') {
        //logicGroups[name].push(Object.keys);
        lv = checkLogicGroups_(where[name], data, name);
        //Logger.log(name + ' lv: ' + lv);
      } else {
        lv = data[name];
        //Logger.log('lv: ' + lv);
      }

      if (parentOperator == '-or' && lv) {
        ok = lv;
      } else {
        if (parentOperator == '-and' && !lv) {
          ok = false;
        }
      }
    }
  } else {
    ok = false;

    for (var n in where) {
      lv = checkLogicGroups_(where[n], data, '');

      if (lv) {
        ok = lv;
        break;
      }
    }
  }

  return ok;
}


function getComparator(operator) {
  var comparator = undefined;

  switch (operator) {
    case '==':
      comparator = function (a, b) {
        return a == b;
      };
      break;
    case '!=':
      comparator = function (a, b) {
        return a != b;
      };
      break;
    case '>=':
      comparator = function (a, b) {
        return a >= b;
      };
      break;
    case '<=':
      comparator = function (a, b) {
        return a <= b;
      };
      break;
    case '>':
      comparator = function (a, b) {
        return a > b;
      };
      break;
    case '<':
      comparator = function (a, b) {
        return a < b;
      };
      break;
    case '~':
      comparator = function (a, b) {
        if (b && typeof b === 'object' && b.constructor === RegExp) {
          return b.exec(a);
        } else {
          var regexp = new RegExp(b);
          return regexp.exec(a);
        }
      };
      break;
    case '&&':
      comparator = function (a, b) {
        return a && b
      };
      break;
    case '||':
      comparator = function (a, b) {
        return a || b
      };
      break;
    default:
      //comparator = function(a, b){};
      throw "Invalid comparison operator: '" + condStr + "'";
      break;
  }

  return function (a, b) {
    var args = Array.prototype.slice.call(arguments).map(function (x) {
      if (isDate(x)) {
        return Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }

      return x;
    });

    return comparator(args[0], args[1]);
  }
}


// Uses only in selectData.
// Extracts from condition {'logicalOperator': value} value, condition string and returns comparison function.
function getComparisonFunction_(condition, comp) {
  var condValue = condition;

  if (condition && typeof condition === 'object' && condition.constructor === Object) {
    var conditions = Object.keys(condition);

    var compFunc = [];

    for (var condStr in condition) {
      (function () {
        var condValue = condition[condStr];
        var comparator = getComparator(condStr);

        if (condValue && typeof condValue === 'object' && condValue.constructor === Array) {
          var compArray = [];

          for (var i in condValue) {
            (function () {
              // bo dla wszystkich pozostaje ostatnia wartość "i"
              var val2 = condValue[i];

              compArray.push(function (value) {
                var out = comparator(value, val2);
                //Logger.log('\ncondStr: ' + condStr + '\nvalue: ' + value + '\nvalue2: ' + condValue[i] + '\nres: ' + out);
                return out;
              });
            })()
          }

          compFunc.push(function (value) {
            if (condStr == '!=' || condStr == '&&') {
              for (var i in compArray) {
                if (!compArray[i](value)) {
                  return false;
                }
              }
              return true;
            } else {
              for (var i in compArray) {
                if (compArray[i](value)) {
                  return true;
                }
              }
              return false;
            }
          });
        } else {
          compFunc.push(function (value) {
            return comparator(value, condValue);
          });
        }

      })()
    }

    return function (a) {
      var test = true;

      for (var n in compFunc) {
        var out = compFunc[n](a);

        if (!out) {
          test = false;
          break;
        }
      }

      return test;
    };

  } else {
    if (condValue && typeof condValue === 'object' && condValue.constructor === Array) {
      return function (value) {
        var test = false;

        for (var i in condValue) {

          if (getComparisonFunction_(condValue[i], comp)(value)) {
            //if (value == condValue[i]){
            test = true;
            break;
          }
        }

        return test;
      }
    } else if (condValue && typeof condValue === 'object' && condValue.constructor === RegExp) {
      return function (value) {
        return condValue.exec(value);
      };
    } else if (condValue && typeof condValue === 'function') {
      return condValue;
    } else {
      return function (value) {
        var comparator = getComparator('==');

        var out = comparator(value, condValue);

        return out;
      }
    }
  }

  return comp;
}

// Updates values for selected columns in given row number.
// Example usage: updateRow(sheet, 2, {'K2': 'x', 'K6': 'y'});
function updateRow(sheet, rowNr, changes, cachedRows, columnIdByName) {
  if (!sheet || !rowNr || !changes) {
    throw 'ERROR: Parameters "sheet", "rowNr" and "changes" are needed!';
  }

  if (!columnIdByName) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues().shift();

    columnIdByName = getColumnIdByName(headers);
  }

  for (var colName in changes) {
    var colValue = changes[colName];
    sheet.getRange(rowNr + 1, columnIdByName[colName] + 1).setValue(colValue);

    if (cachedRows && cachedRows[rowNr] && cachedRows[rowNr][columnIdByName[colName]]) {
      cachedRows[rowNr][columnIdByName[colName]] = colValue;
      Logger.log(cachedRows);
    }
  }

  return true;
}

// Adds given data as new row.
// Example usage: appendRow(testSheet, {'K1': 9, 'K2': 'x', 'K6': 'a'});
function appendRow(sheet, data, cachedRows, columnIdByName) {
  if (!sheet) {
    throw 'ERROR: Parameters "sheet" is needed!';
  }

  if (!data) {
    throw 'ERROR: Parameters "data" is needed!';
  }

  if (!columnIdByName) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues().shift();

    columnIdByName = getColumnIdByName(headers);
  }

  var row = [];

  for (var columnName in data) {
    var colNr = columnIdByName[columnName];
    if (colNr == undefined) {
      throw 'Wrong column name: ' + columnName + '; ' + JSON.stringify(columnIdByName);
    }
    row[columnIdByName[columnName]] = data[columnName];
  }

  for (var n = 0; n < row.length; n++) {
    if (!row[n]) {
      row[n] = '';
    }
  }

  sheet.appendRow(row);

  if (cachedRows) {
    cachedRows.push(row);
  }

  return true;
}


// --- Utils ---


// Return "Associative Array" (means object in JS) from given row [] and headers []
function hashify(row, headers) {
  var rowByColumn = {};
  var occurrences = {};
  var rowLength = row.length;
  for (var i = 0; i < rowLength; i++) {
    var key = headers[i];
    if (occurrences[key] != undefined) {
      occurrences[key]++;
      key = key + '_' + occurrences[key];
    } else {
      occurrences[key] = 1;
    }
    rowByColumn[key] = row[i];
  }

  return rowByColumn;
}


function structure2string(element) {
  if (isArray(element)) {
    var tmp = [];
    element.forEach(function (row) {
      if (!isArray(row) && !isObject(row)) {
        if (row) {
          tmp.push(typeof (row) + '_' + row);
        } else {
          tmp.push('_undef_');
        }
      } else {
        tmp.push(structure2string(row));
      }
    });

    return '[' + tmp.join(',') + ']';
  } else if (isObject(element)) {
    var string = '{';
    Object.keys(element).sort().forEach(function (key) {
      if (!isArray(element[key]) && !isObject(element[key])) {
        if (element[key]) {
          string += key + ':' + typeof (element[key]) + '_' + element[key] + ',';
        } else {
          string += key + ':' + '_undef_' + ',';
        }
      } else {
        string += key + ':' + structure2string(element[key]) + ',';
      }
    });
    string += '}';
    return string;
  } else {
    return element;
  }
  return;
}


function getLastUpdatedTime(SpreadsheetId) {
  return DriveApp.getFileById(SpreadsheetId).getLastUpdated();
};


// --- Checking data types ---
// https://webbjocke.com/javascript-check-data-types/

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isNumber(value) {
  return typeof value === 'number' && isFinite(value);
}

function isArray(value) {
  return value && typeof value === 'object' && value.constructor === Array;
}

function isFunction(value) {
  return typeof value === 'function';
}

function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object;
}

function isNull(value) {
  return value === null;
}

function isUndefined(value) {
  return typeof value === 'undefined';
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isRegExp(value) {
  return value && typeof value === 'object' && value.constructor === RegExp;
}

function isError(value) {
  return value instanceof Error && typeof value.message !== 'undefined';
}

function isDate(value) {
  return value instanceof Date;
}

function isSymbol(value) {
  return typeof value === 'symbol';
}