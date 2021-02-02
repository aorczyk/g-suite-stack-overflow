# G Suite Stack Overflow

### How it works?
The application works on Google Apps Script application development platform. It's simple forum, similar to Stack Overflow. All data is stored in Spreadsheet file on your Google Drive. It's been desinged for G Suite users in given company, login to the app is not required.

User can:
 - ask questions 
 - answer questions
 - add comments
 - vote questions and answers
 - add/remove watchers in given question (watchers get email notification about all changes done in question)
 - create own forum (also private forum for selected users only)
 
### How to install?
1. Install Clasp from [link](https://github.com/google/clasp)
2. In a console window run commands listed below. They do: 
   - log by Clasp in to your Google account,
     ```
     clasp login
     ```
   - create google app scrip file,
     ```
     clasp create 'G Suite Stack Overflow'
     ```
   - fetch created files,
     ```
     clasp pull
     ```
   - clone this repository,
     ```
     git clone https://github.com/aorczyk/g-suite-stack-overflow.git
     ```
   - push code to the new created google app script file,
     ```
     clasp push
     ```
   - open the new created Google App Script file in a browser.
     ```
     clasp open
     ```
```
clasp login
clasp create 'G Suite Stack Overflow'
clasp pull
git clone https://github.com/aorczyk/g-suite-stack-overflow.git
clasp push
clasp open
```
3. In Google App Script editor:
   - open file "Config.gs" and run function "Install" - it will create new folder "G Suite Stack Overflow" on your Google Drive and two Spreadsheet files,
   - in the menu select "Publish" and "Deploy as web app",
   - select "Project version" as "New", add some description, "Execute the app as": Me, "Who has access to the app": "Only myself" or if you want to publish it in your company select "Anyone within ...",
   - copy "Current web app URL" and run it in a browser or click link in "Test web app for your latest code".

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
