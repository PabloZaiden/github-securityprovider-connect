"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Passport = require("passport");
let PassportGithub = require("passport-github");
const Github = require("github");
class GithubSecurityProvider {
    constructor(authenticateUrl, options) {
        let scope = options.scope;
        let seconds = options.secondsUntilCheckPermissionsAgain;
        if (scope == undefined) {
            scope = GithubSecurityProvider.defaultScope;
        }
        if (seconds == undefined) {
            seconds = GithubSecurityProvider.defaultSeconds;
        }
        let githubClientId = process.env.GITHUB_CLIENT_ID;
        let githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
        let githubOrganization = process.env.GITHUB_ORGANIZATION;
        let githubCallbackUrl = process.env.GITHUB_CALLBACK_URL;
        if (!githubCallbackUrl) {
            throw new Error("Missing GITHUB_CALLBACK_URL");
        }
        if (!githubClientId) {
            throw new Error("Missing GITHUB_CLIENT_ID");
        }
        if (!githubClientSecret) {
            throw new Error("Missing GITHUB_CLIENT_SECRET");
        }
        if (!githubOrganization) {
            throw new Error("Missing GITHUB_ORGANIZATION");
        }
        Passport.use(new PassportGithub.Strategy({
            clientID: githubClientId,
            clientSecret: githubClientSecret,
            callbackURL: githubCallbackUrl,
            scope: scope
        }, function (accessToken, refreshToken, profile, done) {
            let login = profile._json.login;
            let gh = GithubSecurityProvider.getGithubClient(accessToken);
            let expireDate = new Date();
            expireDate.setSeconds(expireDate.getSeconds() + seconds);
            gh.orgs.checkMembership({
                username: login,
                org: githubOrganization
            }).then(() => {
                let user = {
                    username: login,
                    user_id: profile._json.id,
                    accessToken: accessToken,
                    expire: expireDate.toString()
                };
                done(null, user);
            }).catch((err) => {
                done(new Error("User is not a member of the required organization: " + githubOrganization));
            });
        }));
        this.authenticateMiddleware = Passport.authenticate("github");
        this.authorizeMiddleware = (req, res, next) => {
            if (!req.isAuthenticated()) {
                res.redirect(authenticateUrl);
            }
            else {
                let user = req.user;
                let expireDate;
                if (user.expire != undefined) {
                    expireDate = new Date(user.expire);
                }
                if (expireDate != undefined && expireDate > new Date()) {
                    next();
                }
                else {
                    let gh = GithubSecurityProvider.getGithubClient(user.accessToken);
                    gh.orgs.checkMembership({
                        username: user.username,
                        org: githubOrganization
                    }).then(() => {
                        let expireDate = new Date();
                        expireDate.setSeconds(expireDate.getSeconds() + seconds);
                        user.expire = expireDate.toString();
                        req.login(user, (err) => {
                            if (err) {
                                next(err);
                            }
                            else {
                                next();
                            }
                        });
                    }).catch((err) => {
                        req.logout();
                        res.redirect(authenticateUrl);
                    });
                }
            }
        };
    }
    getAuthorizeMiddleware() {
        return this.authorizeMiddleware;
    }
    getAuthenticateMiddleware() {
        return this.authenticateMiddleware;
    }
    static getGithubClient(token) {
        let gh = new Github({
            protocol: "https",
            headers: {
                "User-Agent": "github-securityprovider-connect"
            }
        });
        gh.authenticate({
            type: "oauth",
            token: token
        });
        return gh;
    }
}
GithubSecurityProvider.defaultScope = "repo";
GithubSecurityProvider.defaultSeconds = 86400;
exports.GithubSecurityProvider = GithubSecurityProvider;
//# sourceMappingURL=githubSecurityProvider.js.map