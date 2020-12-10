# G Suite Stack Overflow

### How to install:
1. Install Clasp from [link](https://github.com/google/clasp)
2. In console: by Clasp log in to your Google account, create google app scrip file, fetch created file with settings, clone this repository and push code to the new created script file.
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
4. Open script file "Config.gs" and run function "Install" - creates new folder "G Suite Stack Overflow" and two Spreadsheet files.
5. Public the app and run the link in a browser.
