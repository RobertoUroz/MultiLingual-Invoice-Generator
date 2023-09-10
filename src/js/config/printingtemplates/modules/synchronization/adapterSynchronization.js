define(
    ['awsSynchronization'],
    function (awsSynchronization) {
        "use strict";

        var instance = null;

        class adapterSynchronization {

            /**
             * Default Constructor
             *
             *
             * Created by: Roberto Uroz
             */
            constructor() {
            }

            getAccessToken(type, config) {
                switch (type) {
                    case "aws":
                        return new Promise((resolve, reject) => {
                            awsSynchronization.getAccessToken(config).then((accessToken) => {
                                resolve(accessToken);
                            }).catch((e) => reject(e))
                        });
                    default:
                        throw new Error('Unsupported cloud service type');
                }
            }

            uploadObject(type, config, token, objectData, fileName) {
                switch (type) {
                    case "aws":
                        return new Promise((resolve, reject) => {
                            awsSynchronization.uploadObject(token, config, objectData, fileName).then((result) => {
                                resolve(result);
                            }).catch((e) => reject(e))
                        });
                    default:
                        throw new Error('Unsupported cloud service type');
                }
            }
        }

        if (null === instance) {
            instance = new adapterSynchronization();
        }

        return instance;

    }
);