/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

let dataRightClicked;

$(document).ready(function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    let table;

    // create/initialize the dataTable
    OptionsUtil.getDateFormat(
    ).then(dateformat => {
        table = createDataTable(dateformat);

        // add event listener for saving changed pageSize
        table.on('length.dt', function(e, settings, len) {
            browser.storage.local.set({
                pageSizeSmall: len
            });
            // console.log( 'New page length: ' + len);
        });

        $('#fhcTable tbody').on('dblclick', 'tr', function () {
            // show details in a separate window
            DataTableUtil.openDetailViewOnRowClick($(this), table, "view");
        }).on('contextmenu', 'tr', function(event) {
            // custom right-click menu
            // console.log("context menu should now display :-)");
            let tr = $(this).closest('tr');
            let row = table.row( tr );
            dataRightClicked = row.data();
            WindowUtil.showContextMenu(event, '#root');
        }).on('click', 'tr', function(event) {
            // Event listener for closing the context menu when clicked outside the menu
            WindowUtil.hideContextMenuOnClick(event);
        }).on('click', 'td.details-control', function () {
            // show inline details
            const tr = $(this).closest('tr');
            const row = table.row( tr );

            if (row.child.isShown()) {
                // This row is already open - close it
                $('div.detail-root', row.child()).slideUp('fast', function () {
                    row.child.hide();
                    tr.removeClass('shown');
                });
            }
            else {
                closePrevChildIfOpen();
                openChildRow = row.child( DataTableUtil.formatDetail(row.data()), 'no-padding');
                openChildRow.show();
                openTr = tr;
                tr.addClass('shown');
                $('div.detail-root', row.child()).slideDown('fast');
            }
        });
    }).then(() => {
        browser.storage.local.get(
            {pageSizeSmall: 12}
        ).then(result => {
            // set the pagesize to the last used value
            table.page.len(result.pageSizeSmall);
        },
        () => {console.error("Get last used pagesize error", this.error);}
        );
    }).then(() => {
        populateFromDatabase(table, null, null);
    });

    /*.then(() => {
        return browser.tabs.query(
            {lastFocusedWindow: true, active: true}
        );
    }).then(tabs => {
        if (tabs.length === 1) {
            let tab = tabs[0];
            // console.log('popup-small:: Active tab: id: ' + tab.id + ' windowId: ' + tab.windowId);
            // Send only a message to frameId 0 (the main window), inner frames won't receive an event. If the message
            // was sent to all frames on the page multiple responses would arrive but still only one gets processed!
            return browser.tabs.sendMessage(tab.id, {action: "getformfields", targetTabId: tab.id}, {frameId: 0}).then(
                message => {
                    //console.log(`popup-small::responseMessage: ${message.response}`);
                    return message;
                });
        } else {
            return Promise.reject("found 0 or > 1 active tabs");
        }
    }).then(fieldsMsg => {
        // console.log(`received ${fieldsMsg.fields.length} fields!`);
        populateFromDatabase(table, fieldsMsg.fields, fieldsMsg.host);
    }).catch(reason => {
        // console.warn(`Could not get formfields from active tab, showing all instead. Error: ${reason}`);
        populateFromDatabase(table, null, null);
    });*/


    // Prevent the default right-click contextmenu
    document.oncontextmenu = function() {return false;};

    $('.context-menu-item').on('click', function(event) {
        onContextMenuClicked(event.currentTarget.id);
    });

    $('#bigdialog-action').on('click', function() {
        // Let background script open the popup (WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);)
        browser.runtime.sendMessage({eventType: 338}).then(null,
            error=>console.log(`Error sending open-bigdialog event: ${error}`)
        )
    });
    $('#preference-action').on('click', function() {
        // Let background script open the popup (WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);)
        browser.runtime.sendMessage({eventType: 339}).then(null,
            error=>console.log(`Error sending open-preference event: ${error}`)
        )
    });
    $('#closepopup-action').on('click', function() {
        window.close();
    });
});

let openChildRow;
let openTr;
function closePrevChildIfOpen() {
    if (openChildRow) {
        openChildRow.child.hide();
        openTr.removeClass('shown');
        openChildRow = null;
        openTr = null;
    }
}


function onContextMenuClicked(menuItemId) {
    // console.log("context menuItemId " + menuItemId + " clicked...");
    switch (menuItemId) {

        case "add-ctx":
            DataTableUtil.openDetailViewEntry({}, "add");
            WindowUtil.hideContextMenu();
            break;

        case "modify-ctx":
            // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);
            DataTableUtil.openDetailViewEntry(dataRightClicked, "edit");
            WindowUtil.hideContextMenu();
            break;

        case "delete-ctx":
            // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);
            // method expects the primary key
            DataTableUtil.deleteItemFromDatabase(dataRightClicked[0]);
            DataTableUtil.broadcastItemDeletedFromDatabase();
            WindowUtil.hideContextMenu();
            break;

        case "copy2clipboard-ctx":
            // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);
            DataTableUtil.copyEntryToClipboard(dataRightClicked);
            WindowUtil.hideContextMenu();
            break;
    }
}


function createDataTable(dateformat) {
    const languageURL = DataTableUtil.getLanguageURL();
    const i18nFld = DataTableUtil.getLocaleFieldNames();

    return $('#fhcTable').DataTable( {
        scrollY: 300,
        language: {url: languageURL},
        order: [[ 7, "desc" ]],
        paging: true,
        lengthMenu: [10, 12, 20, 50, 100, 500],
        pageLength: 12,
        select: {
            style: 'single',
            info: false,
            selector: 'td:not(.details-control)'
        },

        columns: [
            {
                responsivePriority: 1,
                className: 'details-control',
                orderable: false,
                data: null,
                defaultContent: ''
            },
            { title: "Id", responsivePriority: 2 },
            { title: i18nFld.name, responsivePriority: 3 },
            { title: i18nFld.value, responsivePriority: 4 },
            { title: i18nFld.type, responsivePriority: 10 },
            { title: i18nFld.count, responsivePriority: 5 },
            { title: i18nFld.first, responsivePriority: 9 },
            { title: i18nFld.last, responsivePriority: 7 },
            { title: i18nFld.age, responsivePriority: 6 },
            { title: i18nFld.host, responsivePriority: 8 },
            { title: i18nFld.uri, responsivePriority: 11 }
        ],
        columnDefs: [
            {
                targets: [ 1 ],
                visible: false,
                searchable: false
            },
            {
                targets: 2,
                data: 1,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 14, false, true);
                }
            },
            {
                targets: 3,
                data: 2,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 18, false, true);
                }
            },
            {
                targets: 4,
                data: 3,
                className: "dt-head-left"
            },
            {
                targets: 5,
                data: 4,
                searchable: false,
                type: "num",
                className: "dt-right",
                render: function ( data, /*type, full, meta */) {
                    return (!data) ? "" : data;
                }
            },
            {
                targets: 6,
                data: 5,
                visible: false,
                searchable: false,
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 7,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 8,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.formatAge(data, type);
                }
            },
            {
                targets: 9,
                data: 7,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 15, false, true);
                }
            },
            {
                targets: 10,
                data: 8,
                className: "dt-head-left",
                visible: false,
                searchable: true,
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 15, false, true);
                }
            }
        ]
    } );
}

function populateFromDatabase(table, forFields, forHost) {
    // check if database is accessible
    if (!WindowUtil.isDatabaseAccessible()) {
        return;
    }

    $("#overlaystatus").addClass('spinner').show();

    let req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    req.onerror = function () {
        console.error("Database open error", this.error);
        $("#overlaystatus").hide();
    };
    req.onsuccess = function (event) {
        // Better use "this" than "req" to get the result to avoid problems with garbage collection.
        let db = event.target.result;
        //console.log("Database opened successfully.");

        // create a lookup map
        let forFieldsMap;
        if (forFields) {
            forFieldsMap = new Map();
            forFields.forEach((field)=>{forFieldsMap.set(field.name, field.type)});
        }

        let count = 0;
        let objStore = db.transaction(DbConst.DB_STORE_TEXT, "readonly").objectStore(DbConst.DB_STORE_TEXT);
        let cursorReq = objStore.index(DbConst.DB_TEXT_IDX_LAST).openCursor(null, "prev");
        cursorReq.onsuccess = function(evt) {
            let cursor = evt.target.result;
            if (cursor) {
                let fhcEntry = cursor.value;
                //console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type + "} KEY=[" + fhcEntry.fieldkey + "]");

                // either show all entries or show only the fields/host requested
                if (!forFields || fhcEntry.name === "" || forFieldsMap.has(fhcEntry.name) || fhcEntry.host === forHost) {
                    table.row.add([cursor.primaryKey, fhcEntry.name, fhcEntry.value, fhcEntry.type, fhcEntry.used, fhcEntry.first, fhcEntry.last, fhcEntry.host, fhcEntry.uri]);
                    count += 1;
                }

                // only update display after 15 rows and when finished
                if (count === 15) {
                    table.draw();
                }

                cursor.continue();
            }
            else {
                //console.log("No more entries!");
                table.draw();
                $("#overlaystatus").removeClass('spinner').hide();
            }
        }
    };
}
