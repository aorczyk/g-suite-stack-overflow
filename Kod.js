var APP_CONFIG = {
  appUrl: 'https://script.google.com/macros/s/AKfycby_IcuOQnHbUKIWTzrXIezfqMNrN48xnaLI9URn7ANZ/dev',
  settingsUrl: 'https://docs.google.com/document/d/1Qa_VekOfxVB8IcD3FTA60p6zrTtUlbEuFlrTQ9xDhUM/edit'
};


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

function handleResponse(reqeust) {
  var htmlTemplate = HtmlService.createTemplateFromFile('Forum');

  var user = getUser();
  var forumId = reqeust.parameter.id;
  // var forumId = 'css';

  // var am = getForum(forumId);

  // if (!am) {
  //   return HtmlService.createHtmlOutput("Undefined forum!");
  // }

  // var data = getForumData(forumId);

  htmlTemplate.dataFromServerTemplate = {
    user: user,
    data: {},
    am: {},
    // qId: reqeust.parameter.qId,
    // sId: reqeust.parameter.sId,
  };
  
  var response = htmlTemplate.evaluate();
  
  // if ('pageTitle' in am){
  //   response.setTitle(am.pageTitle);
  // }
  // else {
  //   response.setTitle('GAS Simple Stack Overflow');
  // }

  // if ('faviconUrl' in am){
  //   response.setFaviconUrl(am.faviconUrl);
  // }
  
  return response;
}

function getForum(forumId) {
  // Example data:

  //  var forumsById = {
  //    '123': {
  //      userId: 'adam.orczyk@gmail.com', // is user email
  //      name: 'Test',
  //      forumDataId: '12r0I-MqSmY1OB4zkB1LcqJVQb_ltbEjamYDmyT-x6W8',
  //      forumDataUrl: 'https://docs.google.com/spreadsheets/d/12r0I-MqSmY1OB4zkB1LcqJVQb_ltbEjamYDmyT-x6W8/edit#gid=0'
  //    }
  //  };
  //  DocumentApp.openByUrl(APP_CONFIG.settingsUrl).getBody().setText(JSON.stringify(forumsById));
  //  return;

  var settingsJSON = DocumentApp.openByUrl(APP_CONFIG.settingsUrl).getBody().getText();
  var forumsById = JSON.parse(settingsJSON);

  var forum = forumsById[forumId];

  if (forum) {
    forum.sql = {};
    forum.id = forumId;

    forum.sql = new SqlAbstract({
      spreadsheets: [{
        url: forum.forumDataUrl,
        tables: {
          'Forum': {
            as: 'Forum',
            serializer: {
              'Czas': {
                get: function (x) {
                  return Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
                }
              },
              'ChangedTime': {
                get: function (x) {
                  return x ? Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : ''
                }
              },
              'Vote': {
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
              'Vote': {
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
    'ForumId': forumId,
    'Time': new Date(),
    'UserId': user.email,
    'Action': type,
    'Source': source
  };

  am.sql.insert({
    table: 'Log',
    values: row
  });
}


function getUser() {
  var email = Session.getActiveUser().getEmail();

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
  var am = getForum(id);

  if (!am){
    return {}
  }

  var out = {
    am: am,
    questions: [],
    answers: {},
    comments: {},
    bestAns: {},
    lastChange: {},
    forumLastChange: '-',
    views: {}
  };

  var forumData = am.sql.select({
    table: 'Forum',
    where: {
      'ForumId': id
    }
  });

  for (var n in forumData) {
    var row = forumData[n].get();

    if (row['Status']) {
      continue;
    }

    var type = row['Type'];

    var votes = row['Vote'];
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
      id: row['Id'],
      qId: row['QuestionId'],
      ansId: row['AnswerId'],
      title: row['Tytuł'],
      body: row['Text'],
      status: row['Status'],
      time: row['Czas'],
      vote: voteValue,
      votedBy: votedBy,
      userId: row['UserId'],
      bestAns: row['BestAns'],
      edited: row['ChangedTime'],
      userName: getUserNameFromEmail(row['UserId'])
    }

    out.forumLastChange = rowData.time;

    if (rowData.bestAns) {
      out.bestAns[rowData.qId] = rowData.id;
    }

    if (type == 'question') {
      out.lastChange[rowData.id] = rowData.time;
    } else {
      out.lastChange[rowData.qId] = rowData.time;
    }

    if (type == 'question') {
      out.questions.push(rowData);
      out.answers[rowData.id] = [];
    } else if (type == 'answer') {
      if (!out.answers[rowData.qId]) {
        out.answers[rowData.qId] = [];
      }

      out.answers[rowData.qId].push(rowData);
      out.comments[rowData.id] = [];
    } else if (type == 'comment') {
      if (!out.comments[rowData.ansId]) {
        out.comments[rowData.ansId] = [];
      }

      out.comments[rowData.ansId].push(rowData);
    }
  }

  var viewsData = am.sql.select({
    table: 'Log',
    where: {
      'ForumId': id,
      'Action': 'forum'
    },
    groupBy: ['Source']
  });

  for (var qId in viewsData) {
    // var row = viewsData[n].get();
    // var qId = row['Url Source'];

    // Unique
    // if (!out.views[qId]){
    //   out.views[qId] = Object.keys(viewsData[qId]).length;
    // }

    if (!out.views[qId]) {
      out.views[qId] = viewsData[qId].length;
    }

    // out.views[qId] += 1;
  }

  return out;
}


function forumAddEntry(type, data) {
  var user = getUser();
  var am = getForum(data.forumId);

  var row = {
    'ForumId': data.forumId,
    'Type': type,
    'Id': Utilities.getUuid(),
    'Czas': new Date(),
    'UserId': user.email,
    'Vote': []
  };

  var entryType = '';
  var questionId = data.qId;

  if (type == 'comment') {
    row['QuestionId'] = data.qId;
    row['AnswerId'] = data.aId;
    row['Text'] = data.text;

    entryType = 'nowy komentarz';
  } else if (type == 'answer') {
    row['QuestionId'] = data.qId;
    row['Text'] = data.text;

    entryType = 'nowa odpowiedź';
  } else if (type == 'question') {
    row['Tytuł'] = data.title;
    row['Text'] = data.text;

    entryType = 'nowe pytanie';
    questionId = row.Id;
  }

  am.sql.insert({
    table: 'Forum',
    values: row
  });

  var out = {
    forumId: data.forumId,
    type: type,
    id: row['Id'],
    qId: row['QuestionId'],
    ansId: row['AnswerId'],
    title: row['Tytuł'],
    body: row['Text'],
    status: row['Status'],
    time: Utilities.formatDate(row['Czas'], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    userId: row['UserId'],
    userName: getUserNameFromEmail(row['UserId']),
    vote: 0,
    votedBy: [],
    edited: ''
  };

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
      'Id': id
    }
  })[0];

  var votes = row.get('Vote');

  votes.push({
    time: new Date(),
    userId: user.email,
    value: value
  });

  row.set({
    'Vote': votes
  });
}


function forumBestAns(forumId, id) {
  var user = getUser();
  var am = getForum(forumId);

  var row = am.sql.select({
    table: 'Forum',
    where: {
      'Id': id
    }
  })[0];

  row.set({
    'BestAns': true
  });
}

// Sending email after new entry
function forumAddEntryNotification(type, data) {
  var entryType = '';

  if (type == 'comment') {
    entryType = 'nowy komentarz';
  } else if (type == 'answer') {
    entryType = 'nowa odpowiedź';
  } else if (type == 'question') {
    entryType = 'nowe pytanie';
  }

  var sendTo = [];

  var user = getUser();

  // Do not send notification about owner entries
  if (user.email === data.am.userId) {
    return;
  }

  sendTo.push(data.am.userId);

  var appUrl = ScriptApp.getService().getUrl();

  var link = appUrl + "?action=forum&id=" + data.am.id;
  if (data.qId) {
    link += "&qId=" + data.qId;
  }
  if (data.sId) {
    link += "&sId=" + data.sId;
  }

  var email = {};
  email.topic = data.am.name + Utilities.formatString("Forum %s - %s", data.am.name, entryType);
  email.text = Utilities.formatString("Link do forum: <a href='%s'>link</a><br>", link);

  if (sendTo.length) {
    sendEmail(email, sendTo);
  }

  return sendTo;
}


function sendEmail(email, sendTo) {
  var user = getUser();

  var errors = 0;
  var notSentTo = [];

  for (var n in sendTo) {
    var address = sendTo[n];

    GmailApp.sendEmail(address, email.topic, '', {
      replyTo: user.email,
      name: 'G Suite Stack Overflow',
      htmlBody: email.text
    });
  }

  return 1;
}


function editSave(item) {
  var user = getUser();
  var am = getForum(item.forumId);

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
      'Id': item.id,
    }
  })[0].get();

  am.sql.insert({
    table: 'History',
    values: itemRow
  });

  am.sql.update({
    table: 'Forum',
    where: {
      'Id': item.id,
    },
    set: {
      'Text': item.body,
      'Status': item.status,
      'ChangedTime': new Date(),
      'ChangedBy': user.email,
    }
  });

  item.edited = now;

  return item;
}