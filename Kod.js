var APP_CONFIG = {
  appUrl: 'https://script.google.com/macros/s/AKfycby_IcuOQnHbUKIWTzrXIezfqMNrN48xnaLI9URn7ANZ/dev',
//  settingsUrl: 'https://docs.google.com/document/d/1Qa_VekOfxVB8IcD3FTA60p6zrTtUlbEuFlrTQ9xDhUM/edit'
  settingsUrl: 'https://docs.google.com/spreadsheets/d/18ltuthWnkN4lTBR3L_79S206Wn2oQ7yNhjOnn9uS6sk/edit#gid=0'
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

function handleResponse(request) {
  var htmlTemplate = HtmlService.createTemplateFromFile('Forum');

  var user = getUser();
//  var forumId = reqeust.parameter.id;
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
//    requestPath: request.queryString
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
  var forumsSql = new SqlAbstract({
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
            }
          }
        }
      }]
  });

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
  var am = getForum(id);

  if (!am){
    return {}
  }

  var out = {
    appUrl: ScriptApp.getService().getUrl(),
    am: am,
    name: am.name,
    id: am.id,
    questions: [],
    answers: {},
    comments: {},
    bestAns: {},
    lastChange: {},
    forumLastChange: '-',
    views: {},
    isClosed: false
  };

  if (am.is_closed){
    out.isClosed = true;
    return out;
  }

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
      userId: row['user_id'],
      bestAns: row['best_ans'],
      edited: row['changed_time'],
      watchers: isArray(row['watchers']) ? row['watchers'] : [],
      userName: getUserNameFromEmail(row['user_id'])
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
      'forum_id': id,
      'action': 'forum'
    },
    groupBy: ['source']
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

    entryType = 'nowy komentarz';
  } else if (type == 'answer') {
    row['question_id'] = data.qId;
    row['body'] = data.text;

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
    watchers: row['watchers']
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


function forumBestAns(forumId, id) {
  var user = getUser();
  var am = getForum(forumId);

  var row = am.sql.select({
    table: 'Forum',
    where: {
      'id': id
    }
  })[0];

  row.set({
    'best_ans': true
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
  } else if (type == 'question_edit') {
    entryType = 'edycja pytania';
  }

  var am = getForum(data.forumId);

  var watchers = [];

  if (type == 'question'){
    watchers = am.moderators;
  }
  else {
    var user = getUser();

    // Do not send notification about owner entries
    if (user.email === data.userId) {
      return;
    }

    var question = am.sql.select({
      table: 'Forum',
      where: {
        'id': data.qId
      }
    })[0];
  
    var watchers = question.get('watchers');
  
    if (!watchers.includes(user.email)){
      watchers.push(user.email);
      question.set({'watchers': watchers});
    }
  }



  // Send to question owner
  // var questionUserId = question.get('user_id');

  // if (!watchers.includes(questionUserId)){
  //   watchers.push(questionUserId);
  // }

  // var sendTo = question.get('watchers').filter(funciton(x){return x !== user.email});
  // sendTo.push(data.userId);

  if (watchers.length) {
    var appUrl = ScriptApp.getService().getUrl();

    var link = appUrl + "#/" + data.forumId + "/" + data.qId;
    if (data.sId) {
      link += '/' + data.sId;
    }
    if (type == 'question_edit') {
      link += '/' + data.qId;
    }

    var email = {};
    email.topic = Utilities.formatString("Forum %s - %s", data.forumName, entryType);
    email.text = Utilities.formatString("Link: <a href='%s'>link</a><br>", link);

    sendEmail(email, watchers);
  }

  return watchers;
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
      'id': item.id,
    }
  })[0];

  am.sql.insert({
    table: 'History',
    values: itemRow.get()
  });
  
  // --

  itemRow.set({
    'body': item.body,
    'status': item.status,
    'changed_time': new Date(),
    'changed_by': user.email,
  });

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

  for (var n in newWatchers){
    var email = newWatchers[n];
    if (watchers.indexOf(email) == -1){
      watchers.push(email);
    }
  }

  question.set({'watchers': watchers});

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