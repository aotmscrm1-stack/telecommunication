File Structure
Is there a recommended way to structure React projects?
React doesn’t have opinions on how you put files into folders. That said there are a few common approaches popular in the ecosystem you may want to consider.

Grouping by features or routes
One common way to structure projects is to locate CSS, JS, and tests together inside folders grouped by feature or route.

common/
  Avatar.js
  Avatar.css
  APIUtils.js
  APIUtils.test.js
feed/
  index.js
  Feed.js
  Feed.css
  FeedStory.js
  FeedStory.test.js
  FeedAPI.js
profile/
  index.js
  Profile.js
  ProfileHeader.js
  ProfileHeader.css
  ProfileAPI.js
The definition of a “feature” is not universal, and it is up to you to choose the granularity. If you can’t come up with a list of top-level folders, you can ask the users of your product what major parts it consists of, and use their mental model as a blueprint.

Grouping by file type
Another popular way to structure projects is to group similar files together, for example:

api/
  APIUtils.js
  APIUtils.test.js
  ProfileAPI.js
  UserAPI.js
components/
  Avatar.js
  Avatar.css
  Feed.js
  Feed.css
  FeedStory.js
  FeedStory.test.js
  Profile.js
  ProfileHeader.js
  ProfileHeader.css
Some people also prefer to go further, and separate components into different folders depending on their role in the application. For example, Atomic Design is a design methodology built on this principle. Remember that it’s often more productive to treat such methodologies as helpful examples rather than strict rules to follow.

Avoid too much nesting
There are many pain points associated with deep directory nesting in JavaScript projects. It becomes harder to write relative imports between them, or to update those imports when the files are moved. Unless you have a very compelling reason to use a deep folder structure, consider limiting yourself to a maximum of three or four nested folders within a single project. Of course, this is only a recommendation, and it may not be relevant to your project.

Don’t overthink it
If you’re just starting a project, don’t spend more than five minutes on choosing a file structure. Pick any of the above approaches (or come up with your own) and start writing code! You’ll likely want to rethink it anyway after you’ve written some real code.

If you feel completely stuck, start by keeping all files in a single folder. Eventually it will grow large enough that you will want to separate some files from the rest. By that time you’ll have enough knowledge to tell which files you edit together most often. In general, it is a good idea to keep files that often change together close to each other. This principle is called “colocation”.

As projects grow larger, they often use a mix of both of the above approaches in practice. So choosing the “right” one in the beginning isn’t very important.

React JS Advance-Level Folder Structure
How to run the project

npm i
and

npm start
Before using This project install latest versions of following packages

Axios
Bootstrap - React Strap - MUI - AntD - Tailwind
React Icons
React Router Dom Latest React Router v6
Other Required packages
In the project I have just set Up most used folder structure:

React JS Advanced Folder Structure
.
├── public
|     └── index.html
├── src
    ├── assets
    |     ├── audios
    |     ├── icons
    |     ├── images
    |     └── videos
    ├── components
    |     ├── Button
    |     |     ├── index.jsx
    |     |     └── button.module.css
    |	  ├── inputs
    |     |     ├── index.jsx
    |     |     └── inputs.module.css
    |	  ├── Modal
    |     |     ├── index.jsx
    |     |     └── modal.module.css
    |	  └── Tooltip
    |           ├── index.jsx
    |           └── tooltip.module.css
    |     └── index.js
    ├──  db
    |     ├── productsData.js
    |     └── userData.js
    ├── layout
    |     ├── Header
    |     |     ├── index.jsx
    |     |     └── header.module.css
    |     ├── Navbar.jsx
    |     |     ├── index.jsx
    |     |     └── navbar.module.css
    |     ├── Breadcrumbs.jsx
    |     |     ├── index.jsx
    |     |     └── breadcrumbs.module.css
    |     └── Footer.jsx
    |           ├── index.jsx
    |           └── footer.module.css
    |     └── index.js
    ├── pages
    |     ├── Home
    |     |     ├── index.jsx
    |     |     └── home.module.css
    |     ├── Login
    |     |     ├── index.jsx
    |     |     └── login.module.css
    |     ├── Signup
    |     |     ├── index.jsx
    |     |     └── signup.module.css
    |     └── About
    |           ├── index.jsx
    |           └── about.module.css
    |     └── index.js
    ├── Routers
    |     └── Routers.js
    ├── store
    |     ├── action.js  
    |     ├── reducers.js  
    |     └── store.js
    ├── services
    |     ├── api.js          // API request functions
    |     └── dataUtils.js    // Data manipulation functions
    ├── utils
    |     ├── constants
    |     |     ├── Strapi.js
    |     |     └── Firebase.js
    |     ├── helpers
    |     |     ├── arrays.js
    |     |     └── helpers.js
    |     └── hooks  
    |           └── useIsMobile.js  
    ├── .env
    ├── app.js
    ├── index.css
    ├── index.js
|
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
Folders include
Public
Assests
Components
db
layout
Pages
Routes
services
store
utils
Constants
helpers
hooks
.env.example / .env.development
.eslintrc.cjs
.prettierrc.cjs
.jsonconfig.json
.gitignore
package.json
.vite.config.js
Public
Public mainly contain root file index.html which help to run react project.

Assests
In Assets folder you can put following things.

Images
Video
Icons
CSS
Components
Component will have all the components which are reuseable anywhere in website. Like - Button - Cards - DropDownBtn - inputs - Modal - Popups - Toast - Tooltip - Text/Heading/Title - Skeleton - Spiner/Loader

Constants
Constants folder have Tokens, logins, and those details which we don't want to share with public. Like Env files are used to store sensitive credentials such as API keys. An environment variable supports storing the API link at one location so that we do not need to change the Link in each file manually.

const API_BASE_URL = 'https://api.example.com';
const MAX_ITEMS_PER_PAGE = 10;
db
Here we provide JSON Formate of data in frontend in React APP.

products data
users data
Helpers
Helpers used to store utility functions and modules that provide various helper functionalities. These functions are usually small, reusable, and not directly tied to the main business logic of your application.

Array to Object
Object to Array
Date Formatting
Number Formatting
Validation
Api Request
Helper Functions Details

Layout
This is just a special folder for placing any layout based components.

Header
Footer
Breadcrumbs
Navbar
Sidebar
Pages
Pages will have all the pages which we will use in website.

Routes
Router will have all the Routes in website. Where we are going and where we want to go.

Services
In Services we put configuration file, like when you are using google firebase then your firebase config file will be in services folder.

The "services" folder is often used to contain code related to making *API requests and managing data from external sources. This folder helps separate the concerns of your application by isolating data fetching and manipulation logic from the components that render the UI.

// services/apiService.js
import axios from 'axios';

export function fetchUserData(userId) {
  return axios.get(`/api/users/${userId}`);
}
Store
"store" folder in a React application typically refers to a directory where you manage your application's state using state management libraries like

Redux
Redux Toolkit
Zustand
Context Api
Mobx
|-- store/
|   |-- actions.js        // Redux action creators
|   |-- reducers.js       // Redux reducers
|   |-- store.js          // Redux store configuration
Utils
Utils folder is a common convention in many software projects, including React applications, for storing utility functions and helper modules that provide general-purpose functionality across different parts of the application.

constants
helpers
hooks
Example:

// utils/stringUtils.js
export function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// utils/dateUtils.js
export function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
}
.env.development
Env files are used to store sensitive credentials such as API keys.

REACT_APP_API_URL=http://localhost:3001
REACT_APP_DEBUG_MODE=true
.env.example
Env files are used to store sensitive credentials such as API keys.

REACT_APP_API_KEY=
REACT_APP_API_URL=
.eslintrc.cjs
ESLint, which is a popular tool for linting and enforcing coding style and best practices in JavaScript code. The .eslintrc.cjs file is written in CommonJS module format and is used to configure ESLint for your project.

.gitignore
.gitignore file contain all those files,folders name which user want to skip to push online. If you don't want to push any specific file/folder then you should put their name in .gitignore

.prettierrc.cjs
.prettierrc.cjs file is a configuration file used for Prettier, which is a widely used code formatting tool. Prettier helps ensure consistent and automatic code formatting across your codebase. The .prettierrc.cjs file is written in CommonJS module format and is used to configure Prettier's behavior for your project.

File Format & Naming
Configuration Setup
Export Configuration
module.exports = {
  printWidth: 80,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'es5',
};
jscongig.json
File Purpose
Configuration Setup:
JSON Format
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
package.json
package.json file is core to the Nodejs ecosystem and is a fundamental part of understanding and working with Node. js , npm , and even modern JavaScript . This file is used as a manifest, storing information about applications, modules, packages, and more.

vite.config.js
File Purpose: The vite.config.js file allows you to customize various aspects of your Vite project, including configuration options for the development server, build process, and plugin settings.

Configuration Setup: Inside the vite.config.js file, you export an object containing the configuration options for your Vite project. This object can include settings related to the development server, build process, plugins, and more.

JavaScript Format: The vite.config.js file is written in JavaScript, and it's named vite.config.js. It should be placed in the root directory of your Vite project.

// vite.config.js
export default {
  server: {
    port: 3000
  },
  build: {
    minify: true
  },
  plugins: [/* your plugins here */]
};
@import

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
      '@page': '/src/page'
    }
  },
  plugins: [react()],
})
2nd Method

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';

const alias = {
  // eslint-disable-next-line no-undef
  '@': resolve(__dirname, './src'),
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
})