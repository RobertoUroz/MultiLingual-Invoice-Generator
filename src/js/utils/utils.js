/**
 * @license
 * Copyright (c) 2014, 2020, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 * @ignore
 */
/**
 * @license
 * Copyright (c) 2014, 2018, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
/*
 * Your application specific code will go here
 */

define([],
    function () {

        /**
         * Method for sending notifications to the aria-live region for Accessibility.
         * Sending a notice when the page is loaded, as well as changing the page title
         * is considered best practice for making Single Page Applications Accessbible.
         */
        self.b64toBlob = function (b64Data, contentType, sliceSize) {
            contentType = contentType || '';
            sliceSize = sliceSize || 512;
            var byteCharacters = atob(b64Data);
            var byteArrays = [];
            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            var blob = new Blob(byteArrays, {type: contentType});
            return blob;
        }

        self.blobToBase64 = function (blob) {
            return new Promise((resolve, reject) => {
               const reader = new FileReader();

               reader.onloadend = () => {
                   const base64String = this.result.split(',')[1];
                   resolve(base64String);
               };

               reader.onerror = () => {
                   reject(new Error('Failed to read the Blob as Base64.'));
               }

               reader.readAsDataURL(blob);
            });
        }

        self.checkOnlineStatus = function () {
            if (navigator.connection.type !== Connection.NONE) {
                return true;
            }
            return false;
        }

        return { b64toBlob: b64toBlob, checkOnlineStatus: checkOnlineStatus };

    }
);
