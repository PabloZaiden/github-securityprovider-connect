import * as Express from "express";
import * as Passport from "passport";
import * as Request from "request";
let PassportGithub = require("passport-github");
import * as Github from "github";

export default class GithubSecurityProvider implements SecurityProvider {

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

                let gh = new Github({
                    protocol: "https",
                    headers: {
                        "user-agent": "github-securityprovider-connect"
                    }
                });

                gh.authenticate({
                    type: "oauth",
                    token: accessToken
                });

                gh.orgs.checkMembership({
                    username: login,
                    org: githubOrganization
                }).then(() => {
                    done(null, {
                        username: login,
                        user_id: profile._json.id,
                        accessToken: accessToken
                    });
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
                next();
            }
        }


    }

    getAuthorizeMiddleware(): Express.Handler {
        return this.authorizeMiddleware;
    }

    getAuthenticateMiddleware(): Express.Handler {
        return this.authenticateMiddleware;
    }
}

export interface SecurityProvider {
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
}