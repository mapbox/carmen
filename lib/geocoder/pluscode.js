'use strict';
// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Provides a normal precision code, approximately 14x14 meters.
 * @const {number}
 */
const CODE_PRECISION_NORMAL = 10;

// A separator used to break the code into two parts to aid memorability.
const SEPARATOR_ = '+';

// The number of characters to place before the separator.
const SEPARATOR_POSITION_ = 8;

// The character used to pad codes.
const PADDING_CHARACTER_ = '0';

// The character set used to encode the values.
const CODE_ALPHABET_ = '23456789CFGHJMPQRVWX';

// The base to use to convert numbers to/from.
const ENCODING_BASE_ = CODE_ALPHABET_.length;

// The maximum value for latitude in degrees.
const LATITUDE_MAX_ = 90;

// The maximum value for longitude in degrees.
const LONGITUDE_MAX_ = 180;

// Maximum code length using lat/lng pair encoding. The area of such a
// code is approximately 13x13 meters (at the equator), and should be suitable
// for identifying buildings. This excludes prefix and separator characters.
const PAIR_CODE_LENGTH_ = 10;

// The resolution values in degrees for each position in the lat/lng pair
// encoding. These give the place value of each position, and therefore the
// dimensions of the resulting area.
const PAIR_RESOLUTIONS_ = [20.0, 1.0, .05, .0025, .000125];

// Number of columns in the grid refinement method.
const GRID_COLUMNS_ = 4;

// Number of rows in the grid refinement method.
const GRID_ROWS_ = 5;

// Size of the initial grid in degrees.
const GRID_SIZE_DEGREES_ = 0.000125;

// Minimum length of a code that can be shortened.
const MIN_TRIMMABLE_CODE_LEN_ = 6;

/**
 * Coordinates of a decoded Open Location Code.
 *
 * The coordinates include the latitude and longitude of the lower left and
 * upper right corners and the center of the bounding box for the area the
 * code represents.
 * @class CodeArea
 */
class CodeArea {
    constructor(latitudeLo, longitudeLo, latitudeHi, longitudeHi, codeLength) {
        /**
         * The latitude of the SW corner.
         * @type {number}
         */
        this.latitudeLo = latitudeLo;
        /**
         * The longitude of the SW corner in degrees.
         * @type {number}
         */
        this.longitudeLo = longitudeLo;
        /**
         * The latitude of the NE corner in degrees.
         * @type {number}
         */
        this.latitudeHi = latitudeHi;
        /**
         * The longitude of the NE corner in degrees.
         * @type {number}
         */
        this.longitudeHi = longitudeHi;
        /**
         * The number of digits in the code.
         * @type {number}
         */
        this.codeLength = codeLength;
        /**
         * The latitude of the center in degrees.
         * @type {number}
         */
        this.latitudeCenter = Math.min(
            latitudeLo + (latitudeHi - latitudeLo) / 2, LATITUDE_MAX_);
        /**
         * The longitude of the center in degrees.
         * @type {number}
         */
        this.longitudeCenter = Math.min(
            longitudeLo + (longitudeHi - longitudeLo) / 2, LONGITUDE_MAX_);
    }
}

/**
 * Open Location Code Transformation Functions
 * @class PlusCode
 */
class PlusCode {
    /**
    Returns the OLC alphabet.
    */
    static getAlphavet() {
        return CODE_ALPHABET_;
    }

    /**
     * Determines if a code is valid.
     *
     * To be valid, all characters must be from the Open Location Code character
     * set with at most one separator. The separator can be in any even-numbered
     * position up to the eighth digit.
     *
     * @param {string} code The string to check.
     * @return {boolean} True if the string is a valid code.
     */
    static isValid(code) {
        if (!code || typeof code !== 'string') return false;

        // The separator is required.
        if (code.indexOf(SEPARATOR_) === -1) return false;

        if (code.indexOf(SEPARATOR_) !== code.lastIndexOf(SEPARATOR_)) return false;

        // Is it the only character?
        if (code.length === 1) return false;

        // Is it in an illegal position?
        if (code.indexOf(SEPARATOR_) > SEPARATOR_POSITION_ || code.indexOf(SEPARATOR_) % 2 === 1) return false;

        // We can have an even number of padding characters before the separator,
        // but then it must be the final character.
        if (code.indexOf(PADDING_CHARACTER_) > -1) {
            // Not allowed to start with them!
            if (code.indexOf(PADDING_CHARACTER_) === 0) return false;

            // There can only be one group and it must have even length.
            const padMatch = code.match(new RegExp('(' + PADDING_CHARACTER_ + '+)', 'g'));
            if (padMatch.length > 1 || padMatch[0].length % 2 === 1 || padMatch[0].length > SEPARATOR_POSITION_ - 2) return false;

            // If the code is long enough to end with a separator, make sure it does.
            if (code.charAt(code.length - 1) !== SEPARATOR_) return false;
        }
        // If there are characters after the separator, make sure there isn't just
        // one of them (not legal).
        if (code.length - code.indexOf(SEPARATOR_) - 1 === 1) return false;

        // Strip the separator and any padding characters.
        code = code.replace(new RegExp('\\' + SEPARATOR_ + '+'), '').replace(new RegExp(PADDING_CHARACTER_ + '+'), '');

        // Check the code contains only valid characters.
        for (let i = 0, len = code.length; i < len; i++) {
            const character = code.charAt(i).toUpperCase();
            if (character !== SEPARATOR_ && CODE_ALPHABET_.indexOf(character) === -1) return false;
        }

        return true;
    }

    /**
     * Determines if a code is a valid short code.
     *
     * @param {string} code The string to check.
     * @return {boolean} True if the string can be produced by removing four or
     *     more characters from the start of a valid code.
     */
    static isShort(code) {
        // Check it's valid.
        if (!this.isValid(code)) {
            return false;
        }
        // If there are less characters than expected before the SEPARATOR.
        if (code.indexOf(SEPARATOR_) >= 0 &&
            code.indexOf(SEPARATOR_) < SEPARATOR_POSITION_) {
            return true;
        }
        return false;
    }

    /**
     * Determines if a code is a valid full Open Location Code.
     *
     * @param {string} code The string to check.
     * @return {boolean} True if the code represents a valid latitude and
     *     longitude combination.
     */
    static isFull(code) {
        if (!this.isValid(code)) return false;

        // If it's short, it's not full.
        if (this.isShort(code)) return false;

        // Work out what the first latitude character indicates for latitude.
        const firstLatValue = CODE_ALPHABET_.indexOf(
            code.charAt(0).toUpperCase()) * ENCODING_BASE_;
        if (firstLatValue >= LATITUDE_MAX_ * 2) {
            // The code would decode to a latitude of >= 90 degrees.
            return false;
        }
        if (code.length > 1) {
            // Work out what the first longitude character indicates for longitude.
            const firstLngValue = CODE_ALPHABET_.indexOf(
                code.charAt(1).toUpperCase()) * ENCODING_BASE_;
            if (firstLngValue >= LONGITUDE_MAX_ * 2) {
                // The code would decode to a longitude of >= 180 degrees.
                return false;
            }
        }
        return true;
    }

    /**
     * Encode a location into an Open Location Code.
     *
     * @param {number} latitude The latitude in signed decimal degrees. It will
     *     be clipped to the range -90 to 90.
     * @param {number} longitude The longitude in signed decimal degrees. Will be
     *     normalised to the range -180 to 180.
     * @param {?number} codeLength The length of the code to generate. If
     *     omitted, the value CODE_PRECISION_NORMAL will be used.
     * @return {string} The code.
     * @throws {Exception} if any of the input values are not numbers.
     */
    static encode(latitude, longitude, codeLength) {
        latitude = Number(latitude);
        longitude = Number(longitude);
        if (typeof codeLength === 'undefined') {
            codeLength = CODE_PRECISION_NORMAL;
        } else {
            codeLength = Number(codeLength);
        }
        if (isNaN(latitude) || isNaN(longitude) || isNaN(codeLength)) {
            throw ('ValueError: Parameters are not numbers');
        }
        if (codeLength < 2 ||
            (codeLength < PAIR_CODE_LENGTH_ && codeLength % 2 === 1)) {
            throw 'IllegalArgumentException: Invalid Open Location Code length';
        }
        // Ensure that latitude and longitude are valid.
        latitude = this.clipLatitude(latitude);
        longitude = this.normalizeLongitude(longitude);
        // Latitude 90 needs to be adjusted to be just less, so the returned code
        // can also be decoded.
        if (latitude === 90) {
            latitude = latitude - this.computeLatitudePrecision(codeLength);
        }
        let code = this.encodePairs(latitude, longitude, Math.min(codeLength, PAIR_CODE_LENGTH_));
        // If the requested length indicates we want grid refined codes.
        if (codeLength > PAIR_CODE_LENGTH_) code += this.encodeGrid(latitude, longitude, codeLength - PAIR_CODE_LENGTH_);

        return code;
    }

    /**
     * Decodes an Open Location Code into its location coordinates.
     *
     * Returns a CodeArea object that includes the coordinates of the bounding
     * box - the lower left, center and upper right.
     *
     * @param {string} code The code to decode.
     * @return {CodeArea} An object with the coordinates of the
     *     area of the code.
     * @throws {Exception} If the code is not valid.
     */
    static decode(code) {
        if (!this.isFull(code)) throw ('IllegalArgumentException: Passed Open Location Code is not a valid full code: ' + code);

        // Strip out separator character (we've already established the code is
        // valid so the maximum is one), padding characters and convert to upper
        // case.
        code = code.replace(SEPARATOR_, '');
        code = code.replace(new RegExp(PADDING_CHARACTER_ + '+'), '');
        code = code.toUpperCase();
        // Decode the lat/lng pair component.
        const codeArea = this.decodePairs(code.substring(0, PAIR_CODE_LENGTH_));
        // If there is a grid refinement component, decode that.
        if (code.length <= PAIR_CODE_LENGTH_) {
            return codeArea;
        }
        const gridArea = this.decodeGrid(code.substring(PAIR_CODE_LENGTH_));
        return new CodeArea(
            codeArea.latitudeLo + gridArea.latitudeLo,
            codeArea.longitudeLo + gridArea.longitudeLo,
            codeArea.latitudeLo + gridArea.latitudeHi,
            codeArea.longitudeLo + gridArea.longitudeHi,
            codeArea.codeLength + gridArea.codeLength
        );
    }

    /**
     * Recover the nearest matching code to a specified location.
     *
     * Given a valid short Open Location Code this recovers the nearest matching
     * full code to the specified location.
     *
     * @param {string} shortCode A valid short code.
     * @param {number} referenceLatitude The latitude to use for the reference
     *     location.
     * @param {number} referenceLongitude The longitude to use for the reference
     *     location.
     * @return {string} The nearest matching full code to the reference location.
     * @throws {Exception} if the short code is not valid, or the reference
     *     position values are not numbers.
     */
    static recoverNearest(shortCode, referenceLatitude, referenceLongitude) {
        if (!this.isShort(shortCode)) {
            if (this.isFull(shortCode)) return shortCode;

            throw 'ValueError: Passed short code is not valid: ' + shortCode;
        }
        referenceLatitude = Number(referenceLatitude);
        referenceLongitude = Number(referenceLongitude);
        if (isNaN(referenceLatitude) || isNaN(referenceLongitude)) {
            throw ('ValueError: Reference position are not numbers');
        }
        // Ensure that latitude and longitude are valid.
        referenceLatitude = this.clipLatitude(referenceLatitude);
        referenceLongitude = this.normalizeLongitude(referenceLongitude);

        // Clean up the passed code.
        shortCode = shortCode.toUpperCase();
        // Compute the number of digits we need to recover.
        const paddingLength = SEPARATOR_POSITION_ - shortCode.indexOf(SEPARATOR_);
        // The resolution (height and width) of the padded area in degrees.
        const resolution = Math.pow(20, 2 - (paddingLength / 2));
        // Distance from the center to an edge (in degrees).
        const halfResolution = resolution / 2.0;

        // Use the reference location to pad the supplied short code and decode it.
        const codeArea = this.decode(this.encode(referenceLatitude, referenceLongitude).substr(0, paddingLength) + shortCode);
        // How many degrees latitude is the code from the reference? If it is more
        // than half the resolution, we need to move it north or south but keep it
        // within -90 to 90 degrees.
        if (referenceLatitude + halfResolution < codeArea.latitudeCenter &&
            codeArea.latitudeCenter - resolution >= -LATITUDE_MAX_) {
            // If the proposed code is more than half a cell north of the reference location,
            // it's too far, and the best match will be one cell south.
            codeArea.latitudeCenter -= resolution;
        } else if (referenceLatitude - halfResolution > codeArea.latitudeCenter &&
            codeArea.latitudeCenter + resolution <= LATITUDE_MAX_) {
            // If the proposed code is more than half a cell south of the reference location,
            // it's too far, and the best match will be one cell north.
            codeArea.latitudeCenter += resolution;
        }

        // How many degrees longitude is the code from the reference?
        if (referenceLongitude + halfResolution < codeArea.longitudeCenter) {
            codeArea.longitudeCenter -= resolution;
        } else if (referenceLongitude - halfResolution > codeArea.longitudeCenter) {
            codeArea.longitudeCenter += resolution;
        }

        return this.encode(codeArea.latitudeCenter, codeArea.longitudeCenter, codeArea.codeLength);
    }

    /**
     * Remove characters from the start of an OLC code.
     *
     * This uses a reference location to determine how many initial characters
     * can be removed from the OLC code. The number of characters that can be
     * removed depends on the distance between the code center and the reference
     * location.
     *
     * @param {string} code The full code to shorten.
     * @param {number} latitude The latitude to use for the reference location.
     * @param {number} longitude The longitude to use for the reference location.
     * @return {string} The code, shortened as much as possible that it is still
     *     the closest matching code to the reference location.
     * @throws {Exception} if the passed code is not a valid full code or the
     *     reference location values are not numbers.
     */
    static shorten(code, latitude, longitude) {
        if (!this.isFull(code)) throw 'ValueError: Passed code is not valid and full: ' + code;
        if (code.indexOf(PADDING_CHARACTER_) !== -1) throw 'ValueError: Cannot shorten padded codes: ' + code;

        code = code.toUpperCase();
        const codeArea = this.decode(code);
        if (codeArea.codeLength < MIN_TRIMMABLE_CODE_LEN_) throw 'ValueError: Code length must be at least ' + MIN_TRIMMABLE_CODE_LEN_;

        // Ensure that latitude and longitude are valid.
        latitude = Number(latitude);
        longitude = Number(longitude);
        if (isNaN(latitude) || isNaN(longitude)) throw ('ValueError: Reference position are not numbers');

        latitude = this.clipLatitude(latitude);
        longitude = this.normalizeLongitude(longitude);
        // How close are the latitude and longitude to the code center.
        const range = Math.max(Math.abs(codeArea.latitudeCenter - latitude), Math.abs(codeArea.longitudeCenter - longitude));

        for (let i = PAIR_RESOLUTIONS_.length - 2; i >= 1; i--) {
            // Check if we're close enough to shorten. The range must be less than 1/2
            // the resolution to shorten at all, and we want to allow some safety, so
            // use 0.3 instead of 0.5 as a multiplier.
            if (range < (PAIR_RESOLUTIONS_[i] * 0.3)) {
                // Trim it.
                return code.substring((i + 1) * 2);
            }
        }
        return code;
    }

    /**
     * Clip a latitude into the range -90 to 90.
     *
     * @param {number} latitude
     * @return {number} The latitude value clipped to be in the range.
     */
    static clipLatitude(latitude) {
        return Math.min(90, Math.max(-90, latitude));
    }

    /**
     * Compute the latitude precision value for a given code length.
     * Lengths <= 10 have the same precision for latitude and longitude, but
     * lengths > 10 have different precisions due to the grid method having
     * fewer columns than rows.
     * @param {number} codeLength
     * @return {number} The latitude precision in degrees.
     */
    static computeLatitudePrecision(codeLength) {
        if (codeLength <= 10) {
            return Math.pow(20, Math.floor(codeLength / -2 + 2));
        }
        return Math.pow(20, -3) / Math.pow(GRID_ROWS_, codeLength - 10);
    }

    /**
     * Normalize a longitude into the range -180 to 180, not including 180.
     *
     * @param {number} longitude
     * @return {number} Normalized into the range -180 to 180.
     */
    static normalizeLongitude(longitude) {
        while (longitude < -180) {
            longitude = longitude + 360;
        }
        while (longitude >= 180) {
            longitude = longitude - 360;
        }
        return longitude;
    }

    /**
     * Encode a location into a sequence of OLC lat/lng pairs.
     *
     * This uses pairs of characters (longitude and latitude in that order) to
     * represent each step in a 20x20 grid. Each code, therefore, has 1/400th
     * the area of the previous code.
     *
     * This algorithm is used up to 10 digits.
     *
     * @param {number} latitude The location to encode.
     * @param {number} longitude The location to encode.
     * @param {number} codeLength Requested code length.
     * @return {string} The up to 10-digit OLC code for the location.
     */
    static encodePairs(latitude, longitude, codeLength) {
        let code = '';
        // Adjust latitude and longitude so they fall into positive ranges.
        let adjustedLatitude = latitude + LATITUDE_MAX_;
        let adjustedLongitude = longitude + LONGITUDE_MAX_;
        // Count digits - can't use string length because it may include a separator
        // character.
        let digitCount = 0;
        while (digitCount < codeLength) {
            // Provides the value of digits in this place in decimal degrees.
            const placeValue = PAIR_RESOLUTIONS_[Math.floor(digitCount / 2)];
            // Do the latitude - gets the digit for this place and subtracts that for
            // the next digit.
            let digitValue = Math.floor(adjustedLatitude / placeValue);
            adjustedLatitude -= digitValue * placeValue;
            code += CODE_ALPHABET_.charAt(digitValue);
            digitCount += 1;
            // And do the longitude - gets the digit for this place and subtracts that
            // for the next digit.
            digitValue = Math.floor(adjustedLongitude / placeValue);
            adjustedLongitude -= digitValue * placeValue;
            code += CODE_ALPHABET_.charAt(digitValue);
            digitCount += 1;
            // Should we add a separator here?
            if (digitCount === SEPARATOR_POSITION_ && digitCount < codeLength) {
                code += SEPARATOR_;
            }
        }
        if (code.length < SEPARATOR_POSITION_) {
            code = code + Array(SEPARATOR_POSITION_ - code.length + 1).join(PADDING_CHARACTER_);
        }
        if (code.length === SEPARATOR_POSITION_) {
            code = code + SEPARATOR_;
        }
        return code;
    }

    /**
     * Encode a location using the grid refinement method into an OLC string.
     *
     * The grid refinement method divides the area into a grid of 4x5, and uses a
     * single character to refine the area. This allows default accuracy OLC codes
     * to be refined with just a single character.
     *
     * This algorithm is used for codes longer than 10 digits.
     *
     * @param {number} latitude The location to encode.
     * @param {number} longitude The location to encode.
     * @param {number} codeLength Requested code length.
     * @return {string} The OLC code digits from the 11th digit on.
     */
    static encodeGrid(latitude, longitude, codeLength) {
        let code = '';
        let latPlaceValue = GRID_SIZE_DEGREES_;
        let lngPlaceValue = GRID_SIZE_DEGREES_;
        // Adjust latitude and longitude so they fall into positive ranges and
        // get the offset for the required places.
        latitude += LATITUDE_MAX_;
        longitude += LONGITUDE_MAX_;
        // To avoid problems with floating point, get rid of the degrees.
        latitude = latitude % 1.0;
        longitude = longitude % 1.0;
        let adjustedLatitude = latitude % latPlaceValue;
        let adjustedLongitude = longitude % lngPlaceValue;
        for (let i = 0; i < codeLength; i++) {
            // Work out the row and column.
            const row = Math.floor(adjustedLatitude / (latPlaceValue / GRID_ROWS_));
            const col = Math.floor(adjustedLongitude / (lngPlaceValue / GRID_COLUMNS_));
            latPlaceValue /= GRID_ROWS_;
            lngPlaceValue /= GRID_COLUMNS_;
            adjustedLatitude -= row * latPlaceValue;
            adjustedLongitude -= col * lngPlaceValue;
            code += CODE_ALPHABET_.charAt(row * GRID_COLUMNS_ + col);
        }
        return code;
    }

    /**
     * Decode an OLC code made up of lat/lng pairs.
     *
     * This decodes an OLC code made up of alternating latitude and longitude
     * characters, encoded using base 20.
     *
     * @param {string} code The code to decode, assumed to be a valid full code,
     *     but with the separator removed.
     * @return {CodeArea} The code area object.
     */
    static decodePairs(code) {
        // Get the latitude and longitude values. These will need correcting from
        // positive ranges.
        const latitude = this.decodePairsSequence(code, 0);
        const longitude = this.decodePairsSequence(code, 1);
        // Correct the values and set them into the CodeArea object.
        return new CodeArea(
            latitude[0] - LATITUDE_MAX_,
            longitude[0] - LONGITUDE_MAX_,
            latitude[1] - LATITUDE_MAX_,
            longitude[1] - LONGITUDE_MAX_,
            code.length);
    }

    /**
     * Decode either a latitude or longitude sequence.
     *
     * This decodes the latitude or longitude sequence of a lat/lng pair encoding.
     * Starting at the character at position offset, every second character is
     * decoded and the value returned.
     *
     * @param {string} code A valid full OLC code, with the separator removed.
     * @param {string} offset The character to start from.
     * @return {[number]} An array of two numbers, representing the lower and
     *     upper range in decimal degrees. These are in positive ranges and will
     *     need to be corrected appropriately.
     */
    static decodePairsSequence(code, offset) {
        let i = 0;
        let value = 0;
        while (i * 2 + offset < code.length) {
            value += CODE_ALPHABET_.indexOf(code.charAt(i * 2 + offset)) *
                PAIR_RESOLUTIONS_[i];
            i += 1;
        }
        return [value, value + PAIR_RESOLUTIONS_[i - 1]];
    }

    /**
     * Decode the grid refinement portion of an OLC code.
     *
     * @param {string} code The grid refinement section of a code.
     * @return {CodeArea} The area of the code.
     */
    static decodeGrid(code) {
        let latitudeLo = 0.0;
        let longitudeLo = 0.0;
        let latPlaceValue = GRID_SIZE_DEGREES_;
        let lngPlaceValue = GRID_SIZE_DEGREES_;
        let i = 0;
        while (i < code.length) {
            const codeIndex = CODE_ALPHABET_.indexOf(code.charAt(i));
            const row = Math.floor(codeIndex / GRID_COLUMNS_);
            const col = codeIndex % GRID_COLUMNS_;

            latPlaceValue /= GRID_ROWS_;
            lngPlaceValue /= GRID_COLUMNS_;

            latitudeLo += row * latPlaceValue;
            longitudeLo += col * lngPlaceValue;
            i += 1;
        }
        return new CodeArea(latitudeLo, longitudeLo, latitudeLo + latPlaceValue, longitudeLo + lngPlaceValue, code.length);
    }
}

module.exports = PlusCode;
