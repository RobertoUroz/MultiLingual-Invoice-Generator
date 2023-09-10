define(
    ['utils'],
    function (utils) {
        "use strict";

        var instance = null;

        class awsSynchronization {

            /**
             * Default Constructor
             *
             *
             * Created by: Roberto Uroz
             */
            constructor() {
            }

            getAccessToken(config) {
                var self = this;
                return new Promise((resolve, reject) => {
                    const authUrl = `${config.baseUrl}/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&response_type=code`;

                    const browserRef = cordova.InAppBrowser.open(authUrl, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');

                    browserRef.addEventListener('loadstart', (event) => {
                        if (event.url.startsWith(config.redirectUri)) {
                            browserRef.close();
                            const params = new URL(event.url).searchParams;
                            const code = params.get('code');
                            if (code) {
                                self._getAccessToken(code, config).then((accessToken) => {
                                    resolve(accessToken);
                                }).catch((e) => reject(e));
                            } else {
                                reject(new Error('Authorization code not found in the callback URL.'))
                            }
                        }
                    });
                });
            }

            _getAccessToken(code, config) {
                const requestBody = new URLSearchParams();
                requestBody.append('grant_type', 'authorization_code');
                requestBody.append('code', code);
                requestBody.append('client_id', config.clientId);
                requestBody.append('redirect_uri', config.redirectUri);

                return new Promise((resolve, reject) => {
                    fetch(`${config.baseUrl}/oauth2/token`, {
                        method: 'POST',
                        headers: {
                            'Accept': '*/*',
                            'Host': 'printingtemplatesengine.auth.eu-north-1.amazoncognito.com',
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: requestBody.toString(),
                    }).then(response => response.json())
                        .then((data) => resolve(data.id_token)).catch((e) => {
                        console.log(e);
                        reject(e);
                    });
                });
            }

            uploadObject(accessToken, config, objectData, fileName) {
                const headers = {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/pdf',
                }
                return new Promise((resolve, reject) => {
                    fetch(objectData)
                        .then(res => res.blob())
                        .then(objectBlobData => {
                            fetch(config.apiGatewayUrl + "/" + fileName, {
                                method: 'PUT',
                                headers: headers,
                                body: objectBlobData
                            }).then((result) => {
                                if (result.ok)
                                    resolve(result)
                                else
                                result.text().then(data => {
                                    console.log(data);
                                    reject(data);
                                })
                            }).catch((e) => {
                                console.log(e);
                                reject(e);
                            });
                        });
                });
            }
        }

        if (null === instance) {
            instance = new awsSynchronization();
        }

        return instance;

    }
);