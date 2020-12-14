let db;

// db request for budget database
const request = indexedDB.open("budget", 1);

request.onupgradeneeded = function (event) {
    // Created object store called pending and autoIncrement to true
    const db = event.target.result;
    db.createObjectStore("pending", { autoIncrement: true });
};

request.onsuccess = function (event) {
    db = event.target.result;

    // To see if app is online before reading from db
    if (navigator.onLine) {
        checkDatabase();
    }
};

request.onerror = function (event) {
    console.log("Error! " + event.target.errorCode);
};

function saveRecord(record) {
    // Transaction on pending db with readwrite access
    const transaction = db.transaction(["pending"], "readwrite");

    // Pending object store
    const store = transaction.objectStore("pending");

    // Adding record to store
    store.add(record);
}

function checkDatabase() {
    // Opening transaction on pending db
    const transaction = db.transaction(["pending"], "readwrite");

    // Access pending object store
    const store = transaction.objectStore("pending");

    // Getting all records from store and setting to a variable
    const getAll = store.getAll();

    getAll.onsuccess = function () {
        if (getAll.result.length > 0) {
            fetch("/api/transaction/bulk", {
                method: "POST",
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json"
                }
            })
                .then(response => response.json())
                .then(() => {
                    // Deleting records if successful and opening transaction on pending db
                    const transaction = db.transaction(["pending"], "readwrite");

                    // Accessing pending object store
                    const store = transaction.objectStore("pending");

                    // Clearing all items in store
                    store.clear();
                });
        }
    };
}

// Listening for app to come back online
window.addEventListener("online", checkDatabase);