class DateUtil {

    /**
     * Get the current system date/time in microseconds.
     *
     * @return {number}
     *         the current system date/time in microseconds
     */
    static getCurrentDate() {
        let d = new Date();
        return d.getTime() * 1000;
    }

    /**
     * Get current date/time as string, formatted according to the system locale.
     *
     * @return {String}
     *         the date/time formatted according to the system locale.
     */
    static getCurrentDateString() {
        return this.toDateString(this.getCurrentDate());
    }

    /**
     * Get current date/time as ISO formatted string.
     *
     * @return {String}
     *         the date/time ISO formatted.
     */
    static getCurrentISOdateString() {
        return this.toISOdateString(this.getCurrentDate());
    }

    /**
     * Convert date in microseconds to string according to current locale, parts
     * are left padded with 0 in order to align nicely when used in columns and
     * fractional seconds are excluded.
     *
     * @param   uSeconds {Number}
     *          the date/time in microseconds (internal firefox representation)
     *
     * @returns {String}
     *          date+time according to current locale (ie 15-07-2009 12:01:59)
     */
    static toDateString(uSeconds) {
        if (!uSeconds) return "";
        let d = new Date(uSeconds / 1000);
        return this.dateToDateString(d);
    }

    /**
     * Convert date to string according to current locale, parts
     * are left padded with 0 in order to align nicely when used in columns and
     * fractional seconds are excluded.
     *
     * @param  aDate {Date}
     *         the date/time
     *
     * @return {String}
     *         date+time according to current locale (ie 15-07-2009 12:01:59)
     */
    static dateToDateString(aDate) {
        return this._getShortDateString(aDate) + " " + this._getTimeString(aDate);
    }

    /**
     * Convert ISO date/time back to microseconds.
     *
     * @param  aDateString {String}
     *         the date/time in ISO format (2009-10-19T13:08:34.000)
     *
     * @return {Number}
     *         date in uSeconds (internal representation)
     */
    static fromISOdateString(aDateString) {
        let d = new Date(
            parseInt(aDateString.substr(0, 4), 10),   // year
            parseInt(aDateString.substr(5, 2), 10)-1, // month (zero based!)
            parseInt(aDateString.substr(8, 2), 10),   // day
            parseInt(aDateString.substr(11,2), 10),   // hour
            parseInt(aDateString.substr(14,2), 10),   // minute
            parseInt(aDateString.substr(17,2), 10),   // seconds
            parseInt(aDateString.substr(20,3), 10)    // msec
        );
        return d.getTime()*1000; //msec * 1000
    }

    /**
     * Convert a date/time in microseconds to a date string according to
     * the w3 recommendation (http://www.w3.org/TR/xmlschema-2/#dateTime).
     * (closely related to dates and times described in ISO 8601)
     *
     * Format:
     * '-'? yyyy '-' mm '-' dd 'T' hh ':' mm ':' ss ('.' s+)? (zzzzzz)?
     *
     * Example: 2009-10-19T13:08:34.000
     *
     * @param  uSeconds {Number}
     *         the date/time in microseconds (internal firefox representation)
     *
     * @return {String}
     *         date formatted according to widely accepted xmlschema standard.
     */
    static toISOdateString(uSeconds) {
        if (!uSeconds) return "";
        let msec = uSeconds / 1000;
        let d = new Date(msec);
        let msecPart = msec.toString().substr(-3);
        return this._padZero(d.getFullYear(), 4) + "-" +
            this._padZero(d.getMonth()+1, 2) + "-" +
            this._padZero(d.getDate(), 2) + "T" +
            this._getTimeString(d) + "." +  msecPart;
    }

    /**
     * Get friendly/fuzzy formatted age (3 days) measured as the time between
     * aDate and the current date (aDate presumed before to be before the current date).
     *
     * @param  aDate {Date}
     *         the javascript date/time
     *
     * @return {String}
     *         the timeperiod between the current date and aDate, expressed in a
     *         single unit of time (seconds|minutes|hours|days|weeks|months|years)
     */
    static getFuzzyAge(aDate) {
        let _getIndDay = function(n) {
            return " " + ((n===1) ? "day" : "days");
        };
        let _getIndHour = function(n) {
            return " " + ((n===1) ? "hour" : "hours");
        };
        let _getIndMinute = function(n) {
            return " " + ((n===1) ? "minute" : "minutes");
        };
        let _getIndSecond = function(n) {
            return " " + ((n===1) ? "second" : "seconds");
        };

        let d = new Date();
        let nowDate = d.getTime();

        let result;
        let space = "&nbsp;&nbsp;";
        let noOfSeconds = Math.round((nowDate - aDate) / 1000);
        let noOfDays = Math.round(noOfSeconds / (60 * 60 * 24));

        if (noOfDays > 0) {
            let noOfWeeks = Math.floor(noOfDays / 7);
            let noOfMonths = Math.floor(noOfDays / 30);
            if (noOfMonths > 24) {
                result = Math.round(noOfMonths / 12) + " " + "years";
            }
            else if (noOfMonths > 1) {
                result = noOfMonths + " " + "months";
                if (noOfMonths > 9) space = "";
            }
            else if (noOfWeeks > 2) {
                result = noOfWeeks + " " + "weeks";
            }
            else  {
                result = noOfDays + " " + _getIndDay(noOfDays);
                if (noOfDays > 9) space = "";
            }
        }
        else {
            let noOfHours = Math.round(noOfSeconds / (60*60));
            if (noOfHours > 0) {
                result = noOfHours + _getIndHour(noOfHours);
                if (noOfHours > 9) space = "";
            }
            else {
                if (noOfSeconds < 60) {
                    result = noOfSeconds + _getIndSecond(noOfSeconds);
                    if (noOfSeconds > 9) space = "";
                }
                else {
                    let noOfMinutes = Math.round(noOfSeconds / 60);
                    result = noOfMinutes + _getIndMinute(noOfMinutes);
                    if (noOfMinutes > 9) space = "";
                }
            }
        }
        return space + result;
    }




    //----------------------------------------------------------------------------
    // Helper methods
    //----------------------------------------------------------------------------

    /**
     * Get short date formatted as string.
     *
     * @param  aDate {Date}
     *         the date to convert
     *
     * @return {String}
     *         date converted to string (15-01-2009)
     */
    static _getShortDateString(aDate) {
        let strLocaleDate = aDate.toLocaleDateString();
        let dateSeparator = strLocaleDate.replace(/[0-9]/g,'').charAt(0);
        let dateParts = strLocaleDate.split(dateSeparator);
        let strPaddedDate = '';
        for(let i=0; i<dateParts.length; i++) {
            strPaddedDate += this._padZero(dateParts[i], 2);
            if (i<dateParts.length-1) {
                strPaddedDate += dateSeparator;
            }
        }
        return strPaddedDate;
    }

    /**
     * Get time formatted as string in 24hr format.
     *
     * @param  aDate {Date}
     *         the date to convert
     *
     * @return {String}
     *         date converted to time string (13:05:59)
     */
    static _getTimeString(aDate) {
        return this._padZero(aDate.getHours(), 2) + ":" + this._padZero(aDate.getMinutes(), 2) + ":" + this._padZero(aDate.getSeconds(), 2);
    }


    /**
     * Left pad a value with "0" upto the given maxLength. If aValue >= maxLength
     * then aValue is returned unchanged.
     *
     * @param  aValue {Number|String}
     *         the value to pad
     *
     * @param  maxLength {Number}
     *         left pad upto the maxLength
     *
     * @return {String}
     *         aValue leftpadded with "0"
     */
    static _padZero(aValue, maxLength) {
        let result = "" + aValue;
        while (result.length < maxLength) {
            result = "0" + result;
        }
        return result;
    }

}
