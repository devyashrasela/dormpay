const { auth } = require('express-oauth2-jwt-bearer');

const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256',
});

// Middleware to extract user info from the JWT token
const extractUser = (req, res, next) => {
    if (req.auth && req.auth.payload) {
        req.userSub = req.auth.payload.sub;
    }
    next();
};

module.exports = { checkJwt, extractUser };
