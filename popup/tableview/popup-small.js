'use strict';

$(document).ready(function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});

    // create/initialize the dataTable
    const table = createDataTable();

    browser.tabs.query({lastFocusedWindow: true, active: true}).then(
        (tabs)=>{
            if (tabs.length === 1) {
                return tabs[0];
            } else {
                Promise.reject("found 0 or > 1 active tabs");
            }
        }
    ).then((tab)=> {
        // console.log('popup-small:: Active tab: id: ' + tab.id + ' windowId: ' + tab.windowId);
        // Send only a message to frameId 0 (the main window), inner frames won't receive an event. If the message
        // was sent to all frames on the page multiple responses would arrive but still only one gets processed!
        return browser.tabs.sendMessage(tab.id, {action: "getformfields", targetTabId: tab.id}, {frameId: 0}).then(
            (message)=>{
                //console.log(`popup-small::responseMessage: ${message.response}`);
                return message;
            }
        );
    }).then((fieldsMsg)=>{
        console.log(`received ${fieldsMsg.fields.length} fields!`);
        populateFromDatabase(table, fieldsMsg.fields, fieldsMsg.host);
    }).catch((reason) => {
        console.warn(`Could not get formfields from active tab, showing all instead. Error: ${reason}`);
        populateFromDatabase(table, null, null);
    });

    $('#fhcTable tbody').on('dblclick', 'tr', function () {
        // show details in a separate window
        DataTableUtil.openDetailViewOnRowClick($(this), table, "view");
    }).on('contextmenu', 'tr', function(event) {
        // custom right-click menu
        showContextMenu(event);
    }).on('click', 'tr', function(event) {
        // Event listener for closing the context menu when clicked outside the menu
        hideContextMenuOnClick(event);
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

    // Prevent the default right-click contextmenu
    document.oncontextmenu = function() {return false;};
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

function showContextMenu(event) {
    event.preventDefault();
    const edgeMargin = 10;

    const winRect = document.getElementById('root').getBoundingClientRect();

    document.getElementById('context-menu-container').style.display = 'block';
    const menuRect = document.getElementById('context-menu-wrapper').getBoundingClientRect();

    // get the mouse position and apply an offset to get the mouse-pointer on the first item
    let x = Math.max(0, event.pageX - 60);
    let y = Math.max(0, event.pageY - 20);

    // check if we're near the right edge of the window
    if (x > winRect.width - (menuRect.width + edgeMargin)) {
        x = winRect.width - (menuRect.width + edgeMargin);
    }

    // check if we're near the bottom edge of the window
    if (y > winRect.height - (menuRect.height + edgeMargin)) {
        y = winRect.height - (menuRect.height + edgeMargin);
    }

    const mnu = document.getElementById('context-menu-wrapper');
    mnu.style.top = y + "px";
    mnu.style.left = x + "px";

    // trigger the transition
    document.getElementById('context-menu-wrapper').classList.add('show');
}

function hideContextMenuOnClick(event) {
    // only close the context-menu if clicked outside
    if (!document.getElementById('context-menu-wrapper').contains(event.target)) {
        hideContextMenu();
    }
}

function hideContextMenu() {
    document.getElementById('context-menu-wrapper').classList.remove('show');
    window.setTimeout(()=>{document.getElementById('context-menu-container').style.display = 'none';}, 800);
}


function createDataTable() {
    const languageURL = DataTableUtil.getLanguageURL();

    // get language specific header titles
    const hdrFieldname = browser.i18n.getMessage("fieldName") || 'Fieldname';
    const hdrFieldvalue = browser.i18n.getMessage("fieldValue") || 'Content';
    const hdrFieldType = browser.i18n.getMessage("fieldType") || 'Type';
    const hdrFieldCount = browser.i18n.getMessage("fieldCount") || 'Count';
    const hdrFieldFirst = browser.i18n.getMessage("fieldFirstUsed") || 'First used';
    const hdrFieldLast = browser.i18n.getMessage("fieldLastUsed") || 'Last used';
    const hdrFieldAge = browser.i18n.getMessage("fieldAge") || 'Age';
    const hdrFieldHost = browser.i18n.getMessage("fieldHost") || 'Host';

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
            { title: hdrFieldname, responsivePriority: 3 },
            { title: hdrFieldvalue, responsivePriority: 4  },
            { title: hdrFieldType, responsivePriority: 10  },
            { title: hdrFieldCount, responsivePriority: 5  },
            { title: hdrFieldFirst, responsivePriority: 9  },
            { title: hdrFieldLast, responsivePriority: 7  },
            { title: hdrFieldAge, responsivePriority: 6 },
            { title: hdrFieldHost, responsivePriority: 8  }
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
                    return DataTableUtil.ellipsis(data, type, 20, false, true);
                }
            },
            {
                targets: 3,
                data: 2,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 20, false, true);
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
                    return DataTableUtil.formatDate(data, type);
                }
            },
            {
                targets: 7,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.formatDate(data, type);
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
                    return DataTableUtil.ellipsis(data, type, 25, false, true);
                }
            }
        ]
    } );
}

function populateFromDatabase(table, forFields, forHost) {
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
                    table.row.add([cursor.key, fhcEntry.name, fhcEntry.value, fhcEntry.type, fhcEntry.used, fhcEntry.first, fhcEntry.last, fhcEntry.host]);
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
