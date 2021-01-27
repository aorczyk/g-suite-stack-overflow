var APP_CONFIG = {
//  appUrl: '',
//  settingsUrl: ''
  faviconUrl: 'https://icons-for-free.com/iconfiles/png/512/stackoverflow-1321215626484539706.png',
  pageTitle: 'G Suite Stack Overflow',
  language: 'en'
};

if (!APP_CONFIG.settingsUrl){
  APP_CONFIG.settingsUrl = PropertiesService.getScriptProperties().getProperty('settingsUrl');
}

if (!APP_CONFIG.appUrl){
  APP_CONFIG.appUrl = ScriptApp.getService().getUrl();
}

function Install(){
  appInstall();
}

function setSettingsUrl(){
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('settingsUrl', '');
}