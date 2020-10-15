var APP_CONFIG = {
//  appUrl: '',
//  settingsUrl: ''
//  faviconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Stack_Overflow_icon.svg/768px-Stack_Overflow_icon.svg.png',
  pageTitle: 'G Suite Stack Overflow'
};

if (!APP_CONFIG.settingsUrl){
  APP_CONFIG.settingsUrl = PropertiesService.getScriptProperties().getProperty('settingsUrl');
}

if (!APP_CONFIG.appUrl){
  APP_CONFIG.appUrl = ScriptApp.getService().getUrl();
}