import * as Express from "express";
import * as Passport from "passport";
import * as Request from "request";
let PassportGithub = require("passport-github");
import * as Github from "github";

export class GithubSecurityProvider implements SecurityProvider {

    private authenticateMiddleware: Express.Handler;
    private authorizeMiddleware: Express.Handler;
    private static defaultScope = "repo";
    private static defaultSeconds = 86400;


    constructor(authenticateUrl: string, options?: GithubSecurityProviderOptions) {
        if (options == undefined) {
            options = {};
        }
        
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
        },
            function (accessToken: string, refreshToken: string, profile: any, done: Function) {
                let login = profile._json.login;

                let gh = GithubSecurityProvider.getGithubClient(accessToken);
                let expireDate = new Date();
                expireDate.setSeconds(expireDate.getSeconds() + seconds);

                gh.orgs.checkMembership({
                    username: login,
                    org: githubOrganization
                }).then(() => {
                    let user: GithubUser = {
                        username: login,
                        user_id: profile._json.id,
                        accessToken: accessToken,
                        expire: expireDate.toString()
                    };

                    done(null, user);
                }).catch((err) => {
                    done(new Error("User is not a member of the required organization: " + githubOrganization));
                });
            }
        ));

        this.authenticateMiddleware = Passport.authenticate("github");

        this.authorizeMiddleware = (req, res, next) => {
            if (!req.isAuthenticated()) {
                res.redirect(authenticateUrl);
            } else {
                let user = req.user as GithubUser;
                let expireDate: Date;
                if (user.expire != undefined) {
                    expireDate = new Date(user.expire);
                }

                if (expireDate != undefined && expireDate > new Date()) {
                    next();
                } else {
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
                            } else {
                                next();
                            }
                        })
                    }).catch((err) => {
                        req.logout();
                        res.redirect(authenticateUrl);
                    });
                }
            }
        }


    }

    getAuthorizeMiddleware(): Express.Handler {
        return this.authorizeMiddleware;
    }

    getAuthenticateMiddleware(): Express.Handler {
        return this.authenticateMiddleware;
    }

    private static getGithubClient(token: string) {
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

export interface GithubUser {
    username: string;
    user_id: string;
    accessToken: string;
    expire: string;
}

export interface GithubSecurityProviderOptions {
    scope?: string;
    secondsUntilCheckPermissionsAgain?: number;
}

export interface SecurityProvider {
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
}