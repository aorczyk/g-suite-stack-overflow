# G Suite Stack Overflow

### How it works?
The application works like simple version of Stack Overflow. All data is stored in Spreadsheet file on your Google Drive. It's been desinged for G Suite users in given company, without login to the app. User can:
 - ask questions 
 - answer questions
 - add comments
 - vote questions and answers
 - add/remove watchers in given question (watchers get email notification about all changes done in question)
 - create own forum (also private forum for selected users only)
 
### How to install?
1. Install Clasp from [link](https://github.com/google/clasp)
2. In console: 
 - by Clasp - log in to your Google account,
 - create google app scrip file,
 - fetch created files,
 - clone this repository and push code to the new created script file.
```
clasp login
clasp create 'G Suite Stack Overflow'
clasp pull
git clone https://github.com/aorczyk/g-suite-stack-overflow.git
clasp push
```
3. Open the gas file in a browser:
```
clasp open
```
4. Open script file "Config.gs" and run function "Install" - creates new folder "G Suite Stack Overflow" on your Google Drive and two Spreadsheet files.
5. Public the app and run the link in a browser.

### In the project I used:
 - [Google Apps Script](https://developers.google.com/apps-script) - backend
 - [Google Apps Script SQL Abstract](https://github.com/aorczyk/gas-sql-abstract) - database
 - [Vue.js](https://vuejs.org/) - JavaScript Framework
 - [Vue Router](https://router.vuejs.org/) - official router for Vue.js
 - [Vue I18n](https://kazupon.github.io/vue-i18n/introduction.html) - internationalization plugin of Vue.js
 - [Bulma](https://bulma.io/) - CSS framework
 - [Less](http://lesscss.org/) - language extension for CSS
 - [Quill](https://quilljs.com/) - a free, open source WYSIWYG editor
 - [Font Awesome](https://fontawesome.com/) - icon set
