// Step 1: Use the CommonJS 'require' to import the SDK from node_modules.
const kingsChatSdk = require('kingschat-web-sdk');

// Step 2: Attach the SDK to the global 'window' object so our
//         frontend scripts can find and use it.
window.kingsChatWebSdk = kingsChatSdk.default;

