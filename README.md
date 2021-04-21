# G Suite Stack Overflow

### How it works?
The application works on Google Apps Script application development platform. It's simple forum, similar to Stack Overflow. All data is stored in Spreadsheet file on your Google Drive. It's been desinged for G Suite users in given company, login to the app is not required.

User can:
 - ask questions 
 - add answers
 - add comments and sub answers
 - vote questions and answers
 - add/remove watchers in given question (watchers get email notification about all changes done in question). In private forum watcher get access to the question.
 - create own forum (also private forum for selected users only)
 
### How to install?
1. Install Clasp from [https://github.com/google/clasp](https://github.com/google/clasp)
2. In a console window run commands listed below. They do: 
   - Enable Apps Script API by visiting [https://script.google.com/home/usersettings]
   - log by Clasp in to your Google Account,
     ```
     clasp login
     ```
   - create Google App Script project,
     ```
     clasp create 'G Suite Stack Overflow'
     ```
   - fetch created project,
     ```
     clasp pull
     ```
   - clone this repository,
     ```
     git clone https://github.com/aorczyk/g-suite-stack-overflow.git
     ```
   - push code to the new created Google App Script project,
     ```
     clasp push
     ```
   - open your Google App Script project in a browser editor.
     ```
     clasp open
     ```

3. In Google App Script editor:
   - open file "Config.gs" and run function "Install" - it will create new folder "G Suite Stack Overflow" on your Google Drive and two Spreadsheet files,
   - in the menu select "Publish" and "Deploy as web app",
   - select "Project version" as "New", add some description, "Execute the app as": Me, "Who has access to the app": "Only myself" or if you want to publish it in your company select "Anyone within ...",
   - copy "Current web app URL" and run it in a browser or click link in "Test web app for your latest code".
   - after first deploy set a web app URL in "Config.gs" in APP_CONFIG.appUrl, save the file and deploy the app again.

### In the project I used:
 - [Google Apps Script](https://developers.google.com/apps-script/overview) - backend and running environment
 - [Google Apps Script SQL Abstract](https://github.com/aorczyk/gas-sql-abstract) - database
 - [Vue.js](https://vuejs.org/) - JavaScript Framework
 - [Vue Router](https://router.vuejs.org/) - official router for Vue.js
 - [Vue I18n](https://kazupon.github.io/vue-i18n/introduction.html) - internationalization plugin of Vue.js
 - [Bulma](https://bulma.io/) - CSS framework
 - [Less](http://lesscss.org/) - language extension for CSS
 - [Quill](https://quilljs.com/) - a free, open source WYSIWYG editor
 - [Font Awesome](https://fontawesome.com/) - icon set
