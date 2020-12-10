# G Suite Stack Overflow

### How to install:
1. Install Clasp [link](https://github.com/google/clasp)
2. In console: by clasp log in to your google account, create script file, clone this repository and push code to new created script file.
```
clasp login
clasp create 'G Suite Stack Overflow'
clasp pull
git clone https://github.com/aorczyk/g-suite-stack-overflow.git
clasp push
```
3. Open the script file in a browser:
```
clasp open
```
4. Open script file "Config.gs" and run function "Install" - creates new folder "G Suite Stack Overflow" and two Spreadsheet files.
5. Public the app and run the link in a browser.
