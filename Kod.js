function doGet(e) {
  return handleResponse(e);
}

function doPost(e) {
  return handleResponse(e);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

function handleResponse(request) {
  var htmlTemplate = HtmlService.createTemplateFromFile('Forum');

  var user = getUser();

  htmlTemplate.dataFromServerTemplate = {
    user: user,
    language: APP_CONFIG.language,
    logoImg: APP_CONFIG.faviconUrl,
    appTitle: APP_CONFIG.appTitle,
  };
  
  var response = htmlTemplate.evaluate();
  
  if ('pageTitle' in APP_CONFIG){
    response.setTitle(APP_CONFIG.pageTitle);
  }
  else {
    response.setTitle('G Suite Stack Overflow');
  }

  if ('faviconUrl' in APP_CONFIG){
    response.setFaviconUrl(APP_CONFIG.faviconUrl);
  }
  
  return response;
}

function getSqlForums(){
  var sql = new SqlAbstract({
    spreadsheets: [{
      url: APP_CONFIG.settingsUrl,
      tables: {
        'Forums': {
          as: 'Forums',
          serializer: {
            'moderators': {
              get: JSON.parse,
              set: JSON.stringify
            },
            'admins': {
              get: JSON.parse,
              set: JSON.stringify
            },
            'users': {
              get: JSON.parse,
              set: JSON.stringify
            },
            'time': {
              get: function (x) {
                return Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
              }
            },
            'watchers': {
              get: JSON.parse,
              set: JSON.stringify
            },
          }
        }
      }
    }]
  });

  return sql;
}

function getForums() {
  var forumsSql = getSqlForums();
  var user = getUser();

  var forums = forumsSql.select({
    table: 'Forums',
    where: [{'is_public': true}, {'user_id': user.email}, {'watchers': function(x){return x.includes(user.email)}}],
    orderBy: {'name': 'asc'}
  }).map((x)=>{
    // Postprocess
    var out = x.get();
    
    out.userName = getUserNameFromEmail(out.user_id);

    var isAdmin = out.admins.includes(user.email);
    var isOwner = out.user_id === user.email;

    out.canEdit = isAdmin || isOwner;

    return out;
  });

  return forums;
}

function addForum(data){
  var forumsSql = getSqlForums();
  var user = getUser();

  var forumId = Utilities.getUuid();

  var forumSheetUrl = forumSheetCreate(forumId);

  var row = {
    'time': new Date(),
    'id': forumId,
    'user_id': user.email,
    'name': data.name,
    'description': data.description,
    'is_public': data.is_public,
    'users': data.users.split(','),
    'moderators': data.moderators.split(','),
    'admins': data.admins.split(','),
    'forum_data_url': forumSheetUrl
  };

  forumsSql.insert({
    table: 'Forums',
    values: row
  });

  return true;
}

function editForum(data){
  var forumsSql = getSqlForums();
  var user = getUser();
  var am = getForum(data.id);

  var isModerator = am.moderators.includes(user.email);
  var isAdmin = am.admins.includes(user.email);
  var isOwner = am.user_id === user.email;

  // Only autor and moderator can edit
  if (!(isModerator || isAdmin || isOwner)){
    return;
  }

  forumsSql.update({
    table: 'Forums',
    where: {id: data.id},
    set: {
      name: data.name,
      description: data.description,
      is_public: data.is_public,
      scored_questions: data.scored_questions,
      users: typeof data.users === 'string' ? data.users.split(',') : [],
      moderators: typeof data.moderators === 'string' ? data.moderators.split(',') : []
    }
  });

  return true;
}

function getForum(forumId) {
  var forumsSql = getSqlForums();

  var forum = forumsSql.select({
    table: 'Forums',
    where: {id: forumId}
  })[0].get();

  if (forum) {
    forum.sql = {};

    forum.sql = new SqlAbstract({
      spreadsheets: [{
        url: forum.forum_data_url,
        tables: {
          'Forum': {
            as: 'Forum',
            serializer: {
              'time': {
                get: function (x) {
                  return Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
                }
              },
              'changed_time': {
                get: function (x) {
                  return x ? Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : ''
                }
              },
              'vote': {
                get: JSON.parse,
                set: JSON.stringify
              },
              'watchers': {
                get: JSON.parse,
                set: JSON.stringify
              },
            }
          },
          'DocOpenLog': {
            as: 'Log'
          },
          'History': {
            as: 'History',
            serializer: {
              'vote': {
                set: JSON.stringify
              },
              'watchers': {
                set: JSON.stringify
              },
            }
          }
        }
      }]
    });
  }

  return forum;
}


function onClickLog(forumId, type, source) {
  var user = getUser();

  var am = getForum(forumId);

  var row = {
    'forum_id': forumId,
    'time': new Date(),
    'user_id': user.email,
    'action': type,
    'source': source
  };

  am.sql.insert({
    table: 'Log',
    values: row
  });

  var row = am.sql.select({
    table: 'Forum',
    where: {
      'id': source
    }
  })[0];

  var views = row.get('views');

  row.set({
    'views': views ? views + 1 : 1
  });
}


function getUser() {
  var email = Session.getActiveUser().getEmail();

  if (!email){
    email = 'Unknown visitor';
  }

  return {
    id: email,
    email: email,
    name: getUserNameFromEmail(email),
  }
}

function getUserNameFromEmail(email) {
  var match = email.match(/^(.+)@/);
  if (match) {
    return match[1].split('.').map(function (s) {
      return jsUcfirst(s)
    }).join(' ');
  } else {
    return email;
  }
}


function jsUcfirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


function getForumData(id) {
  var user = getUser();
  
  var am = getForum(id);

  if (!am){
    return {}
  }

  if (am.is_closed){
    return {
      isClosed: true
    };
  }

  var isModerator = am.moderators.includes(user.email);
  var isAdmin = am.admins.includes(user.email);
  var isUser = am.users.includes(user.email);
  var isOwner = am.user_id === user.email;
  var isWatcher = am.watchers.includes(user.email);

  if (!am.is_public && !(isModerator || isAdmin || isUser || isOwner || isWatcher)){
    return {
      accessDenied: true
    };
  }

  var out = {
    appUrl: APP_CONFIG.appUrl,
    am: am,
    name: am.name,
    id: am.id,
    questions: [],
    answers: {},
    comments: {},
    lastChange: {},
    forumLastChange: '-',
    views: {},
    scoredQuestions: am.scored_questions
  };

  var forumData = am.sql.select({
    table: 'Forum',
    where: {
      'forum_id': id
    }
  });

  for (var n in forumData) {
    var row = forumData[n].get();

    if (row['status']) {
      continue;
    }

    var type = row['type'];

    var votes = row['vote'];
    var votedBy = [];
    var voteValue = 0;

    for (var m in votes) {
      var item = votes[m];
      voteValue += item.value;
      votedBy.push(item.userId);
    }

    var rowData = {
      forumId: id,
      type: type,
      id: row['id'],
      qId: row['question_id'],
      ansId: row['answer_id'],
      title: row['title'],
      body: row['body'],
      status: row['status'],
      time: row['time'],
      vote: voteValue,
      votedBy: votedBy,
      views: row['views'] || 0,
      userId: row['user_id'],
      bestAns: row['best_ans'],
      edited: row['changed_time'],
      watchers: isArray(row['watchers']) ? row['watchers'] : [],
      userName: getUserNameFromEmail(row['user_id']),
      canEdit: row['user_id'] === user.email || isModerator || isAdmin || isOwner,
      // scoredQuestions: am.scored_questions
    }

    out.forumLastChange = rowData.time;

    if (type == 'question') {
      out.lastChange[rowData.id] = rowData.time;
    } else {
      out.lastChange[rowData.qId] = rowData.time;
    }

    if (type == 'question') {
      if (!am.is_public && !(isModerator || isAdmin || isUser || isOwner) && !rowData.watchers.includes(user.email)){
        continue;
      }

      out.questions.push(rowData);
      out.answers[rowData.id] = [];
    } else if (type == 'answer') {
      if (!out.answers[rowData.qId]) {
        continue;
        out.answers[rowData.qId] = [];
      }

      out.answers[rowData.qId].push(rowData);
      out.comments[rowData.id] = [];
    } else if (type == 'comment') {
      if (!out.comments[rowData.ansId]) {
        continue;
        out.comments[rowData.ansId] = [];
      }

      out.comments[rowData.ansId].push(rowData);
    }
  }

  // var viewsData = am.sql.select({
  //   table: 'Log',
  //   where: {
  //     'forum_id': id,
  //     'action': 'forum'
  //   },
  //   groupBy: ['source']
  // });

  // for (var qId in viewsData) {
  //   // var row = viewsData[n].get();
  //   // var qId = row['Url Source'];

  //   // Counting only unique views
  //   // if (!out.views[qId]){
  //   //   out.views[qId] = Object.keys(viewsData[qId]).length;
  //   // }

  //   if (!out.views[qId]) {
  //     out.views[qId] = viewsData[qId].length;
  //   }

  //   // out.views[qId] += 1;
  // }

  return out;
}


function forumAddEntry(type, data) {
  var user = getUser();
  var am = getForum(data.forumId);

  var row = {
    'forum_id': data.forumId,
    'type': type,
    'id': Utilities.getUuid(),
    'time': new Date(),
    'user_id': user.email,
    'vote': [],
    'watchers': []
  };

  var entryType = '';
  var questionId = data.qId;

  if (type == 'comment') {
    row['question_id'] = data.qId;
    row['answer_id'] = data.aId;
    row['body'] = data.text;
    row['watchers'].push(user.email);
    entryType = 'nowy komentarz';

  } else if (type == 'answer') {
    row['question_id'] = data.qId;
    row['body'] = data.text;
    row['watchers'].push(user.email);
    entryType = 'nowa odpowiedź';
    
  } else if (type == 'question') {
    row['title'] = data.title;
    row['body'] = data.text;
    row['watchers'].push(user.email);
    entryType = 'nowe pytanie';
    questionId = row.id;
  }

  var out = {
    forumId: data.forumId,
    type: type,
    id: row['id'],
    qId: row['question_id'],
    ansId: row['answer_id'],
    title: row['title'],
    body: row['body'],
    status: row['status'],
    time: Utilities.formatDate(row['time'], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    userId: row['user_id'],
    userName: getUserNameFromEmail(row['user_id']),
    vote: 0,
    votedBy: [],
    edited: '',
    watchers: row['watchers'],
    canEdit: true
  };

  am.sql.insert({
    table: 'Forum',
    values: row
  });

  for (var key in out){
    if (out[key] === undefined){
      out[key] = '';
    }
  }

  return out;
}


function forumVote(forumId, id, value) {
  var user = getUser();
  var am = getForum(forumId);

  var row = am.sql.select({
    table: 'Forum',
    where: {
      'id': id
    }
  })[0];

  var votes = row.get('vote');

  votes.push({
    time: new Date(),
    userId: user.email,
    value: value
  });

  row.set({
    'vote': votes
  });
}


function forumBestAns(forumId, qId, id) {
  var am = getForum(forumId);

  var row = am.sql.select({
    table: 'Forum',
    where: {
      'id': qId
    }
  })[0];

  row.set({
    'best_ans': id
  });
}

// Sending email after new entry
function forumAddEntryNotification(type, data) {
  var actionName = '';

  if (type == 'comment') {
    actionName = 'New comment';
  } else if (type == 'answer') {
    actionName = 'New answer';
  } else if (type == 'question') {
    actionName = 'New question';
  } else if (type == 'edit') {
    actionName = 'Editted ' + data.type;
  }

  var am = getForum(data.forumId);

  var watchers = [];

  watchers = watchers.concat(am.moderators);

  var question = am.sql.select({
    table: 'Forum',
    where: {
      'id': data.qId
    }
  })[0];

  var qWatchers = question.get('watchers');
  var qTitle = question.get('title');

  for (var n in qWatchers){
    var watcher = qWatchers[n];

    if (!watchers.includes(watcher)){
      watchers.push(watcher);
    }
  }

  var user = getUser();

  // Do not send notification about current user changes
  watchers = watchers.filter((x)=>{
    return x && x !== user.email;
  });

  if (watchers.length) {
    var appUrl = APP_CONFIG.appUrl;

    var link = appUrl + "#/" + data.forumId + "/" + data.qId;
    if (data.sId) {
      link += '/' + data.sId;
    }
    if (type == 'edit' && data.type == 'question') {
      link += '/' + data.qId;
    }

    var email = {};
    email.topic = Utilities.formatString("Forum %s - %s", data.forumName, actionName);
    if (type == 'question'){
      email.text = Utilities.formatString("New topic: <b>%s</b><br><br>Show: <a href='%s'>link</a><br>", qTitle, link);
    } else {
      email.text = Utilities.formatString("New changes in topic: <b>%s</b><br>%s:<br><div style='background-color: #fffbec;'>%s</div><br>Show: <a href='%s'>link</a><br>", qTitle, actionName, data.body,link);
    }
    
    sendEmail(email, watchers);
  }

  return watchers;
}


function sendEmail(email, sendTo) {
  GmailApp.sendEmail('', email.topic, '', {
    bcc: sendTo.join(','),
    // replyTo: user.email,
    name: 'G Suite Stack Overflow',
    htmlBody: email.text
  });

  return 1;
}


function editSave(item) {
  var user = getUser();
  var am = getForum(item.forumId);

  var isModerator = am.moderators.includes(user.email);
  var isAdmin = am.admins.includes(user.email);
  var isOwner = am.user_id === user.email;
  var isEntryOwner = item.userId === user.email;

  // Who can edit.
  if (!(isModerator || isAdmin || isOwner || isEntryOwner)){
    return;
  }

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  if (!item.body){
    item.status = 'Deleted';
  }
  else {
    item.status = '';
  }

  // History

  var itemRow = am.sql.select({
    table: 'Forum',
    where: {
      'id': item.id,
    }
  })[0];

  am.sql.insert({
    table: 'History',
    values: itemRow.get()
  });
  
  // Update previous row
  if (item.body.length < 50000){
    itemRow.set({
      'title': item.title,
      'body': item.body,
      'status': item.status,
      'changed_time': new Date(),
      'changed_by': user.email,
    });
  } else {
    // Liczba znaków w Twoich danych wejściowych przekracza dopuszczalną wartość 50000 znaków na jedną komórkę.

    // Copy previous row and insert as new row.
    var newRow = itemRow.get();
    newRow.title = item.title;
    newRow.body = item.body;
    newRow.status = item.status;
    newRow.changed_time = new Date();
    newRow.changed_by = user.email;

    am.sql.insert({
      table: 'Forum',
      values: newRow
    });

    // Delete previous row.
    itemRow.sheet.deleteRow(itemRow.rowNr);
  }

  item.edited = now;

  return item;
}


function addWatchers(forumId, qId, newWatchers) {
  var am = getForum(forumId);

  var question = am.sql.select({
    table: 'Forum',
    where: {
      'id': qId,
    }
  })[0];

  var watchers = question.get('watchers');
  var addedWatchers = [];

  for (var n in newWatchers){
    var watcherEmail = newWatchers[n];
    if (watchers.indexOf(watcherEmail) == -1){
      watchers.push(watcherEmail);
      addedWatchers.push(watcherEmail);
    }
  }

  question.set({'watchers': watchers});

  // Forum watchers

  var forum = getSqlForums().select({
    table: 'Forums',
    where: {
      'id': forumId,
    }
  })[0];

  var forumWatchers = forum.get('watchers');
  var forumAddedWatchers = [];

  for (var n in newWatchers){
    var watcherEmail = newWatchers[n];
    if (forumWatchers.indexOf(watcherEmail) == -1){
      forumWatchers.push(watcherEmail);
      forumAddedWatchers.push(watcherEmail);
    }
  }

  if (forumAddedWatchers.length){
    forum.set({'watchers': forumWatchers});
  }

  var appUrl = APP_CONFIG.appUrl;

  var link = appUrl + "#/" + am.id + "/" + qId;

  var email = {};
  email.topic = Utilities.formatString("Forum %s - %s", am.name, 'watching');
  email.text = Utilities.formatString("You was added as a watcher of the topic: <b>%s</b><br><br>Show: <a href='%s'>link</a><br>", question.get('title'), link);

  sendEmail(email, addedWatchers);

  return true;
}

function removeWatcher(forumId, qId, email) {
  var am = getForum(forumId);

  var question = am.sql.select({
    table: 'Forum',
    where: {
      'id': qId,
    }
  })[0];

  var watchers = question.get('watchers');

  var index = watchers.indexOf(email);
  watchers.splice(index, 1);

  question.set({'watchers': watchers});

  return true;
}


function forumSheetCreate(forumId) {
  var folderName = 'G Suite Stack Overflow';

  var folderIterator = DriveApp.getFoldersByName(folderName);

  if (folderIterator.hasNext()){
    var folder = folderIterator.next();
    var ssForumData = SpreadsheetApp.create('Forum Data - ' + forumId);
    DriveApp.getFileById(ssForumData.getId()).moveTo(folder);

    var sql = new SqlAbstract();

    var forumColumns = ['forum_id','type','id','question_id','answer_id','time','user_id','status','title','body','attachment','vote','best_ans','changed_time','changed_by','watchers','views'];
    sql.createDB({
      spreadsheet: ssForumData.getUrl(),
      tables: [
        {
          name: 'Forum',
          columns: forumColumns
        },
        {
          name: 'History',
          columns: forumColumns
        },
        {
          name: 'DocOpenLog',
          columns: ['forum_id','time','user_id','action','source']
        },
      ]
    });

    return ssForumData.getUrl();
  }
}


function appInstall() {
  var user = getUser();
  
  var folderName = 'G Suite Stack Overflow';
  
  if (!DriveApp.getFoldersByName(folderName).hasNext()){
    var folder = DriveApp.createFolder(folderName);
    var ssForums = SpreadsheetApp.create('Forums');
    
    DriveApp.getFileById(ssForums.getId()).moveTo(folder);
    
    // Moving the script to created folder
    // DriveApp.getFileById(ScriptApp.getScriptId()).moveTo(folder);

    var sql = new SqlAbstract();
    
    sql.createDB({
      spreadsheet: ssForums.getUrl(),
      tables: [
        {
          name: 'Forums',
          columns: ['time','id','user_id','name','description','forum_data_url','is_public','is_closed','users','moderators','admins','watchers','scored_questions']
        }
      ]
    })
    
    var forumSheetUrl = forumSheetCreate('demo');
    
    sql.insert({table: 'Forums', values: {time: new Date(), id: 'demo', user_id: user.email, name: 'Demo', description: 'Example', forum_data_url: forumSheetUrl, users: '[]', moderators: '[]', admins: '[]', watchers: '[]'}});
        
    var scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('settingsUrl', ssForums.getUrl());
    APP_CONFIG.settingsUrl = ssForums.getUrl();
    
    forumAddEntry('question', {forumId: 'demo', title: 'First question', text: 'Question body'});
  }
  else {
    throw 'Folder already exists.';
  }
}