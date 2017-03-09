import * as Express from "express";
import * as Passport from "passport";
import * as Request from "request";
let PassportGithub = require("passport-github");
import * as Github from "github";

export class GithubSecurityProvider implements SecurityProvider {

    private authenticateMiddleware: Express.Handler;
    private authorizeMiddleware: Express.Handler;

    constructor(authenticateUrl: string) {
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
            scope: "repo"
        },
            function (accessToken: string, refreshToken: string, profile: any, done: Function) {
                let login = profile._json.login;

                let gh = GithubSecurityProvider.getGithubClient(accessToken);

                gh.orgs.checkMembership({
                    username: login,
                    org: githubOrganization
                }).then(() => {
                    let user: GithubUser = {
                        username: login,
                        user_id: profile._json.id,
                        accessToken: accessToken
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
                let gh = GithubSecurityProvider.getGithubClient(user.accessToken);
                
                gh.orgs.checkMembership({
                    username: user.username,
                    org: githubOrganization
                }).then(() => {
                    next();
                }).catch((err) => {
                    req.logout();
                    res.redirect(authenticateUrl);
                });
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
}

export interface SecurityProvider {
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
}