// x-login
const xLoginTokenXHR = new XMLHttpRequest();
xLoginTokenXHR.open('POST', 'http://adapt2.sis.pitt.edu/next.course-authoring/api/auth/x-login-token', true);
xLoginTokenXHR.setRequestHeader('Content-Type', 'application/json');
xLoginTokenXHR.onerror = () => console.log('There was an error with the request.');
xLoginTokenXHR.onload = function () {
    if (xLoginTokenXHR.status >= 200 && xLoginTokenXHR.status < 300) {
        console.log('x-login-token:', xLoginTokenXHR.responseText);

        const xLoginXHR = new XMLHttpRequest();
        xLoginXHR.open('POST', 'http://adapt2.sis.pitt.edu/next.course-authoring/api/auth/x-login', true);
        xLoginXHR.setRequestHeader('Content-Type', 'application/json');
        xLoginXHR.onerror = () => console.log('There was an error with the request.');
        xLoginXHR.onload = function () {
            if (xLoginXHR.status >= 200 && xLoginXHR.status < 300) {
                console.log('x-login:', xLoginXHR.responseText);
            } else {
                console.log('x-login:', xLoginXHR.status);
            }
        };
        xLoginXHR.send(JSON.stringify({ token: xLoginTokenXHR.responseText }));
    } else {
        console.log('x-login-token:', xLoginTokenXHR.status);
    }
};

xLoginTokenXHR.send(JSON.stringify({
    fullname: 'John Doe',
    email: 'johndoe@host.local',
    password: 'johndoe'
}));

// --------------------------------------------------

// logout
const logoutXHR = new XMLHttpRequest();
logoutXHR.withCredentials = true;
logoutXHR.open('POST', 'http://adapt2.sis.pitt.edu/next.course-authoring/api/auth/logout', true);
logoutXHR.setRequestHeader('Content-Type', 'application/json');
logoutXHR.onerror = () => console.log('There was an error with the request.');
logoutXHR.onload = function () {
    if (logoutXHR.status >= 200 && logoutXHR.status < 300) {
        console.log('logout:', logoutXHR.responseText);
    } else {
        console.log('logout:', logoutXHR.status);
    }
};
logoutXHR.send(JSON.stringify({}));