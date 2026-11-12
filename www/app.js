/* =====================================================
   1. FIREBASE CONFIGURATION
====================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDufNV9vfsItdh0Wb_O1gHlyadPBmm8GqY",
    authDomain: "campusfind-c85b2.firebaseapp.com",
    projectId: "campusfind-c85b2",
    storageBucket: "campusfind-c85b2.firebasestorage.app",
    messagingSenderId: "405326556908",
    appId: "1:405326556908:web:88020307d20c51c322ffc9",
    measurementId: "G-35HZ15394V"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const firestore = firebase.firestore();

const serverTime = () =>
    firebase.firestore.FieldValue.serverTimestamp();


/* =====================================================
   2. APPLICATION CONSTANTS
====================================================== */
var CATEGORIES = [
    "IDs & Cards", "Wallets & Bags", "Electronics","Calculators & School Supplies", "Clothing", "Keys", "Others"
];

var PLACES = [
    "Library","Canteen","Gym","Chapel", "Faber hall", "Engineering", "SBM Building", "Aggies Building", "SS Building", "STC Building", "Medicine Building",
    "Main Building","Science Building","Parking Area", "Other"
];

var AUTH = [
    "Guard Post (Main Gate)",
    "Library Desk",
    "Faculty Office",
    "Security Office",
    "Other"
];

var EMAIL_DOMAIN = "@xu.edu.ph";


/* =====================================================
   3. FIRESTORE DATA
====================================================== */

var db = {
    reports: [],
    claims: []
};

var unsubscribeReports = null;
var unsubscribeClaims = null;


/* =====================================================
   4. APPLICATION STATE
====================================================== */

var S = {
    user: null,
    authReady: false,
    pendingName: "",
    view: "login",
    cat: "All",
    q: "",
    tab: "all",
    reg: false,
    sel: null,
    atab: "reports",
    aq: "",
    ptype: "lost",
    handed: "no",
    photo: ""
};

var draft = {};


/* =====================================================
   5. HELPER FUNCTIONS
====================================================== */

function $(id) {
    return document.getElementById(id);
}

function esc(s) {
    return String(s == null ? "" : s).replace(
        /[&<>"']/g,
        function(c) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[c];
        }
    );
}

function toast(message) {
    var t = $("toast");

    t.textContent = message;
    t.className = "on";

    setTimeout(function() {
        t.className = "";
    }, 2000);
}

function label(s) {
    return {
        open: "Open",
        claim_pending: "Claim Pending",
        returned: "Returned",
        pending: "Pending Review",
        rejected: "Rejected",
        approved: "Approved"
    }[s] || s;
}

function rep(id) {
    return db.reports.find(function(r) {
        return r.id === id;
    });
}

function newestFirst(a, b) {
    var timeA = a.createdAt && a.createdAt.toMillis
        ? a.createdAt.toMillis()
        : 0;

    var timeB = b.createdAt && b.createdAt.toMillis
        ? b.createdAt.toMillis()
        : 0;

    return timeB - timeA;
}

function words(t) {
    return String(t)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(function(w) {
            return w.length > 2;
        });
}

function matches(r) {
    var w = words(r.title + " " + r.desc);

    return db.reports
        .filter(function(o) {
            return o.type !== r.type &&
                o.cat === r.cat &&
                (
                    o.status === "open" ||
                    o.status === "claim_pending"
                );
        })
        .map(function(o) {
            var ow = words(o.title + " " + o.desc);

            return {
                r: o,
                n: w.filter(function(x) {
                    return ow.indexOf(x) > -1;
                }).length
            };
        })
        .filter(function(m) {
            return m.n > 0;
        })
        .sort(function(a, b) {
            return b.n - a.n;
        });
}

function go(view, id) {
    S.view = view;

    if (id !== undefined) {
        S.sel = id;
    }

    draw();
}

function setNav(view) {
    S.view = view;
    draw();
}


/* =====================================================
   6. FIRESTORE REAL-TIME LISTENERS
====================================================== */

function stopDataListeners() {
    if (unsubscribeReports) {
        unsubscribeReports();
        unsubscribeReports = null;
    }

    if (unsubscribeClaims) {
        unsubscribeClaims();
        unsubscribeClaims = null;
    }

    db.reports = [];
    db.claims = [];
}

function startDataListeners() {
    stopDataListeners();

    // REPORTS
    unsubscribeReports = firestore
        .collection("reports")
        .orderBy("createdAt", "desc")
        .onSnapshot(function(snapshot) {

            db.reports = snapshot.docs.map(function(doc) {
                return {
                    ...doc.data(),
                    id: doc.id
                };
            });

            if (S.user) {
                draw();
            }

        }, function(error) {
            console.error("Reports loading error:", error);
            toast("Unable to load reports. Check Firestore permissions.");
        });


    // CLAIMS (admins see all; students only their own, so private
    // claim details are never downloaded by other users)
    var claimsQuery = S.user && S.user.admin
        ? firestore.collection("claims")
        : firestore.collection("claims")
            .where("claimantUid", "==", S.user ? S.user.uid : "");

    unsubscribeClaims = claimsQuery
        .onSnapshot(function(snapshot) {

            db.claims = snapshot.docs.map(function(doc) {
                return {
                    ...doc.data(),
                    id: doc.id
                };
            });

            if (S.user) {
                draw();
            }

        }, function(error) {
            console.error("Claims loading error:", error);
            toast("Unable to load claims. Check Firestore permissions.");
        });
}


/* (Firebase Authentication now lives in auth.js) */


/* (Login And Registration Screen now lives in auth.js) */


/* =====================================================
   9. REPORT CARDS AND FEED
====================================================== */

function card(r) {
    return `
        <div class="card item" onclick="go('detail','${esc(r.id)}')">

            <div class="thumb">
                ${r.photo
                    ? `<img class="thumb" src="${esc(r.photo)}" alt="">`
                    : "📦"}
            </div>

            <div style="min-width:0">
                <h3>${esc(r.title)}</h3>

                <span class="tag t-${r.type}">
                    ${r.type === "lost" ? "Lost" : "Found"}
                </span>

                <span class="tag s-${r.status}">
                    ${label(r.status)}
                </span>

                <div class="meta">
                    ${esc(r.cat)} •
                    ${esc(r.place)} •
                    ${esc(r.date)}
                </div>
            </div>
        </div>
    `;
}

function vFeed() {
    var list = db.reports.filter(function(r) {
        if (r.status === "pending" || r.status === "rejected") {
            return false;
        }

        if (S.tab !== "all" && r.type !== S.tab) {
            return false;
        }

        if (S.cat !== "All" && r.cat !== S.cat) {
            return false;
        }

        var q = S.q.toLowerCase();

        return !q ||
            (r.title + " " + r.desc + " " + r.place)
                .toLowerCase()
                .indexOf(q) > -1;

    }).sort(newestFirst);

    return `
        <input id="q"
            placeholder="Search items, e.g. wallet"
            value="${esc(S.q)}"
            oninput="S.q=this.value;draw(true)"
            style="margin-top:0">

        <div class="chips">
            ${["all", "lost", "found"].map(function(t) {
                return `
                    <button class="${S.tab === t ? "on" : ""}"
                        onclick="S.tab='${t}';draw()">
                        ${{all:"All",lost:"Lost",found:"Found"}[t]}
                    </button>
                `;
            }).join("")}
        </div>

        <div class="chips">
            ${["All"].concat(CATS).map(function(c) {
                return `
                    <button class="${S.cat === c ? "on" : ""}"
                        onclick="S.cat='${c}';draw()">
                        ${esc(c)}
                    </button>
                `;
            }).join("")}
        </div>

        ${list.length
            ? list.map(card).join("")
            : `<div class="empty">
                No reports match. Try another keyword or category,
                or post one yourself.
            </div>`
        }
    `;
}


/* =====================================================
   10. ITEM DETAILS AND MATCHING
====================================================== */

function vDetail() {
    var r = rep(S.sel);

    if (!r) {
        return '<div class="empty">Report not found.</div>';
    }

    var mine = r.ownerUid === S.user.uid;
    var h = "";

    h += r.photo
        ? `<img class="photo" src="${esc(r.photo)}" alt="">`
        : "";

    h += `
        <div class="card">

            <h2 style="margin-top:0">${esc(r.title)}</h2>

            <span class="tag t-${r.type}">
                ${r.type === "lost" ? "Lost" : "Found"}
            </span>

            <span class="tag s-${r.status}">
                ${label(r.status)}
            </span>

            <p style="margin:10px 0">${esc(r.desc)}</p>

            <div class="meta">
                Category: ${esc(r.cat)}<br>
                Location: ${esc(r.place)}<br>
                Date: ${esc(r.date)}<br>
                Posted by: ${esc(r.owner)}
            </div>
        </div>
    `;

    if (r.type === "found") {
        h += `
            <div class="pick">
                ${r.handed
                    ? `<b>Handed to:</b> ${esc(r.auth || "a local authority")}`
                    : `<b>Not yet handed to an authority.</b>
                        The finder is still holding this item.`
                }
            </div>
        `;
    }

    var myc = db.claims.find(function(c) {
        return c.rid === r.id &&
            c.claimantUid === S.user.uid;
    });

    if (myc) {
        h += `
            <div class="card">
                <b>Your claim</b>

                <span class="tag s-${myc.status}">
                    ${myc.status === "pending"
                        ? "Awaiting admin"
                        : label(myc.status)}
                </span>

                <p class="meta" style="margin-top:6px">
                    ${esc(myc.details)}
                </p>

                ${myc.status === "approved"
                    ? `<div class="pick">
                        Approved. Pick up at:
                        <b>${esc(r.auth || "the local authority")}</b>.
                        Bring your school ID.
                    </div>`
                    : ""
                }
            </div>
        `;

    } else if (
        r.type === "found" &&
        !mine &&
        r.status === "open"
    ) {
        h += `
            <button class="btn gold"
                onclick="go('claim','${esc(r.id)}')">
                This is mine - claim it
            </button>
        `;
    }

    var m = matches(r);

    h += `
        <h2>Possible matches</h2>

        ${m.length
            ? m.map(function(x) {
                return card(x.r);
            }).join("")
            : `<div class="meta">
                No matches yet. Check back later.
            </div>`
        }
    `;

    return h;
}


/* =====================================================
   11. CLAIM SUBMISSION
====================================================== */

function vClaim() {
    var r = rep(S.sel);

    if (!r) {
        return '<div class="empty">Report not found.</div>';
    }

    return `
        <div class="card">
            <b>${esc(r.title)}</b>
            <div class="meta">
                ${esc(r.cat)} • ${esc(r.place)}
            </div>
        </div>

        <label>Describe details only the owner would know</label>

        <textarea id="cd" rows="5"
            placeholder="Color, what is inside, marks, stickers, scratches..."></textarea>

        <div class="err" id="er"></div>

        <button class="btn" onclick="sendClaim('${esc(r.id)}')">
            Send claim
        </button>
    `;
}

async function sendClaim(id) {
    var d = $("cd").value.trim();

    if (d.length < 10) {
        $("er").textContent =
            "Add more detail (at least 10 characters).";
        return;
    }

    var r = rep(id);

    if (!r) {
        $("er").textContent = "Report not found.";
        return;
    }

    if (r.ownerUid === S.user.uid) {
        $("er").textContent =
            "You cannot claim your own report.";
        return;
    }

    if (r.status !== "open" || r.type !== "found") {
        $("er").textContent =
            "This item is no longer available for claims.";
        return;
    }

    var existingClaim = db.claims.find(function(c) {
        return c.rid === id &&
            c.claimantUid === S.user.uid &&
            c.status !== "rejected";
    });

    if (existingClaim) {
        $("er").textContent =
            "You already have a claim for this item.";
        return;
    }

    try {
        await firestore.collection("claims").add({
            rid: id,
            by: S.user.email,
            claimantUid: S.user.uid,
            details: d,
            status: "pending",
            createdAt: serverTime()
        });

        await firestore.collection("reports")
            .doc(String(id))
            .update({
                status: "claim_pending"
            });

        toast("Claim submitted successfully!");
        go("detail", id);

    } catch (error) {
        console.error("Claim submission error:", error);

        $("er").textContent =
            "Unable to submit claim. Please try again.";
    }
}


/* =====================================================
   12. REPORT CREATION
====================================================== */

function vPost() {
    var f = S.ptype === "found";

    return `
        <div class="seg">
            <button class="l ${!f ? "on" : ""}"
                onclick="keep();S.ptype='lost';draw()">
                I lost something
            </button>

            <button class="f ${f ? "on" : ""}"
                onclick="keep();S.ptype='found';draw()">
                I found something
            </button>
        </div>

        <label>Item name</label>
        <input id="ti" placeholder="e.g. Black wallet">

        <label>Category</label>
        <select id="ca">
            ${CATS.map(function(c) {
                return `<option>${esc(c)}</option>`;
            }).join("")}
        </select>

        <label>Description</label>
        <textarea id="de" rows="3"
            placeholder="Color, brand, anything distinctive"></textarea>

        <label>Where was it ${f ? "found" : "lost"}?</label>
        <select id="pl">
            ${PLACES.map(function(c) {
                return `<option>${esc(c)}</option>`;
            }).join("")}
        </select>

        <label>Date</label>
        <input id="dt" type="date"
            value="${new Date().toISOString().slice(0, 10)}">

        ${f ? `
            <label>Was the item handed to a local authority?</label>

            <select id="hd"
                onchange="S.handed=this.value;keep();draw()">

                <option value="no"
                    ${S.handed === "no" ? "selected" : ""}>
                    No, I still have it
                </option>

                <option value="yes"
                    ${S.handed === "yes" ? "selected" : ""}>
                    Yes
                </option>
            </select>

            ${S.handed === "yes" ? `
                <label>Handed to</label>
                <select id="au">
                    ${AUTH.map(function(c) {
                        return `<option>${esc(c)}</option>`;
                    }).join("")}
                </select>
            ` : ""}
        ` : ""}

        <label>Photo (optional)</label>
        <input id="ph" type="file"
            accept="image/*"
            onchange="pickPhoto(this)">

        ${S.photo
            ? `<img class="photo" src="${esc(S.photo)}" alt="Preview">`
            : ""
        }

        <div class="err" id="er"></div>

        <button class="btn" id="submitReportBtn"
            onclick="sendReport()">
            Submit for review
        </button>

        <p class="meta" style="margin-top:8px">
            An admin checks every report before it appears in the feed.
        </p>
    `;
}

function keep() {
    [
        "ti", "ca", "de", "pl", "dt", "hd", "au"
    ].forEach(function(k) {
        if ($(k)) {
            draft[k] = $(k).value;
        }
    });
}

function pickPhoto(inp) {
    var f = inp.files[0];

    if (!f) {
        return;
    }

    if (!f.type.startsWith("image/")) {
        toast("Please select an image.");
        return;
    }

    if (f.size > 5 * 1024 * 1024) {
        toast("Please select an image smaller than 5 MB.");
        inp.value = "";
        return;
    }

    var rd = new FileReader();

    rd.onload = function() {
        var im = new Image();

        im.onload = function() {
            var w = Math.min(800, im.width);
            var c = document.createElement("canvas");

            c.width = w;
            c.height = im.height * (w / im.width);

            c.getContext("2d").drawImage(
                im, 0, 0, c.width, c.height
            );

            S.photo = c.toDataURL("image/jpeg", .7);

            keep();
            draw();
        };

        im.src = rd.result;
    };

    rd.readAsDataURL(f);
}

async function sendReport() {
    var t = $("ti").value.trim();
    var er = $("er");

    er.textContent = "";

    if (!t) {
        er.textContent = "Enter an item name.";
        return;
    }

    var description = $("de").value.trim();

    if (!description) {
        er.textContent = "Enter an item description.";
        return;
    }

    var date = $("dt").value;

    if (!date) {
        er.textContent = "Select a date.";
        return;
    }

    var f = S.ptype === "found";
    var hd = f && S.handed === "yes";

    if (S.photo && S.photo.length > 700000) {
        er.textContent =
            "This photo is too large. Please choose a smaller image.";
        return;
    }

    var reportData = {
        type: S.ptype,
        title: t,
        cat: $("ca").value,
        desc: description,
        place: $("pl").value,
        date: date,

        owner: S.user.email,
        ownerUid: S.user.uid,

        status: "pending",

        handed: hd,
        auth: hd ? $("au").value : "",

        photo: S.photo || "",

        createdAt: serverTime()
    };

    var submitButton = $("submitReportBtn");
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    try {
        await firestore.collection("reports").add(reportData);

        S.photo = "";
        S.handed = "no";
        draft = {};

        toast("Report saved! Waiting for admin review.");

        setNav("mine");

    } catch (error) {
        console.error("Report submission error:", error);

        er.textContent =
            "Unable to save your report. Please check your connection and try again.";

        submitButton.disabled = false;
        submitButton.textContent = "Submit for review";
    }
}


/* =====================================================
   13. USER ACTIVITY
====================================================== */

function vMine() {
    var rs = db.reports.filter(function(r) {
        return r.ownerUid === S.user.uid;
    }).sort(newestFirst);

    var cs = db.claims.filter(function(c) {
        return c.claimantUid === S.user.uid;
    }).sort(newestFirst);

    return `
        <h2 style="margin-top:0">My reports</h2>

        ${rs.length
            ? rs.map(card).join("")
            : `<div class="empty">
                No reports yet. Tap Post to add one.
            </div>`
        }

        <h2>My claims</h2>

        ${cs.length
            ? cs.map(function(c) {
                var r = rep(c.rid);

                if (!r) return "";

                return `
                    <div class="card item"
                        onclick="go('detail','${esc(r.id)}')">

                        <div>
                            <b>${esc(r.title)}</b>

                            <span class="tag s-${c.status}">
                                ${c.status === "pending"
                                    ? "Awaiting admin"
                                    : label(c.status)}
                            </span>

                            <div class="meta">
                                ${esc(c.details)}
                            </div>
                        </div>
                    </div>
                `;
            }).join("")
            : `<div class="meta">No claims yet.</div>`
        }
    `;
}


/* =====================================================
   14. ADMIN DASHBOARD
====================================================== */

function vAdmin() {
    var pr = db.reports.filter(function(r) {
        return r.status === "pending";
    });

    var pc = db.claims.filter(function(c) {
        return c.status === "pending";
    });

    var ac = db.claims.filter(function(c) {
        return c.status === "approved" &&
            rep(c.rid) &&
            rep(c.rid).status === "claim_pending";
    });

    var rt = db.reports.filter(function(r) {
        return r.status === "returned";
    });

    var T = S.atab;

    var h = `
        <div class="stats">

            ${[
                ["Reports to review", pr.length, "reports"],
                ["Claims to review", pc.length, "claims"],
                ["Ready for handover", ac.length, "handover"],
                ["Returned", rt.length, "all"]
            ].map(function(x) {
                return `
                    <button class="stat"
                        onclick="S.atab='${x[2]}';draw()">
                        <b>${x[1]}</b>
                        ${x[0]}
                    </button>
                `;
            }).join("")}

        </div>

        <div class="chips">
            ${[
                ["reports", "Reports"],
                ["claims", "Claims"],
                ["handover", "Handover"],
                ["all", "All records"]
            ].map(function(t) {
                return `
                    <button class="${T === t[0] ? "on" : ""}"
                        onclick="S.atab='${t[0]}';draw()">
                        ${t[1]}
                    </button>
                `;
            }).join("")}
        </div>
    `;

    if (T === "reports") {
        h += pr.length
            ? pr.map(function(r) {
                return `
                    <div class="card">
                        <h3>${esc(r.title)}</h3>

                        <span class="tag t-${r.type}">
                            ${r.type === "lost" ? "Lost" : "Found"}
                        </span>

                        <div class="meta">
                            ${esc(r.cat)} •
                            ${esc(r.place)} •
                            ${esc(r.date)}
                        </div>

                        ${r.photo
                            ? `<img class="photo"
                                style="margin-top:8px"
                                src="${esc(r.photo)}" alt="">`
                            : ""
                        }

                        <p style="margin:8px 0">
                            ${esc(r.desc)}
                        </p>

                        <div class="meta">
                            Posted by ${esc(r.owner)}
                        </div>

                        ${r.type === "found"
                            ? `<div class="pick">
                                ${r.handed
                                    ? `Handed to:
                                        <b>${esc(r.auth)}</b>.
                                        Check with them that the item is there.`
                                    : `Not handed to an authority.
                                        Confirm with the finder.`
                                }
                            </div>`
                            : ""
                        }

                        <div class="chk">
                            Checked for spam, duplicates and real details
                        </div>

                        <button class="btn sm ok"
                            onclick="decide('r','${esc(r.id)}','open')">
                            Approve
                        </button>

                        <button class="btn sm bad"
                            onclick="decide('r','${esc(r.id)}','rejected')">
                            Reject
                        </button>
                    </div>
                `;
            }).join("")
            : `<div class="empty">
                No reports waiting for review.
            </div>`;
    }

    if (T === "claims") {
        h += pc.length
            ? pc.map(function(c) {
                var r = rep(c.rid);

                if (!r) return "";

                return `
                    <div class="card">
                        <h3>${esc(r.title)}</h3>

                        <div class="meta">
                            Item posted by ${esc(r.owner)}
                        </div>

                        <div class="meta" style="margin-top:6px">
                            <b>Item description:</b>
                            ${esc(r.desc)}
                        </div>

                        <div class="pick"
                            style="background:#fff8e6;border-color:#f0d78c">

                            <b>Claimant (${esc(c.by)}) says:</b><br>
                            ${esc(c.details)}
                        </div>

                        <button class="btn sm ok"
                            onclick="decide('c','${esc(c.id)}','approved')">
                            Approve claim
                        </button>

                        <button class="btn sm bad"
                            onclick="decide('c','${esc(c.id)}','rejected')">
                            Reject claim
                        </button>
                    </div>
                `;
            }).join("")
            : `<div class="empty">
                No claims waiting for review.
            </div>`;
    }

    if (T === "handover") {
        h += ac.length
            ? ac.map(function(c) {
                var r = rep(c.rid);

                return `
                    <div class="card">
                        <h3>${esc(r.title)}</h3>

                        <div class="meta">
                            Claimant: ${esc(c.by)}<br>
                            Pick up at: ${esc(r.auth || "not set")}
                        </div>

                        <button class="btn sm"
                            onclick="decide('m','${esc(c.id)}')">
                            Mark as returned
                        </button>
                    </div>
                `;
            }).join("")
            : `<div class="empty">
                No approved claims waiting for pickup.
            </div>`;
    }

    if (T === "all") {
        var q = (S.aq || "").toLowerCase();

        var all = db.reports.filter(function(r) {
            return !q ||
                (r.title + " " + r.owner + " " + r.status)
                    .toLowerCase()
                    .indexOf(q) > -1;
        }).sort(newestFirst);

        h += `
            <input id="aq"
                placeholder="Search title, email or status"
                value="${esc(S.aq || "")}"
                oninput="S.aq=this.value;draw(true)">

            ${all.length
                ? all.map(card).join("")
                : `<div class="empty">No records match.</div>`
            }
        `;
    }

    return h;
}


/* =====================================================
   15. ADMIN ACTIONS
====================================================== */

async function decide(k, id, v) {
    try {
        if (k === "r") {

            await firestore.collection("reports")
                .doc(String(id))
                .update({
                    status: v,
                    reviewedAt: serverTime(),
                    reviewedBy: S.user.uid
                });

        } else {
            var c = db.claims.find(function(x) {
                return x.id === id;
            });

            if (!c) {
                toast("Claim not found.");
                return;
            }

            var r = rep(c.rid);

            if (!r) {
                toast("Related report not found.");
                return;
            }

            if (k === "c") {

                await firestore.collection("claims")
                    .doc(String(id))
                    .update({
                        status: v,
                        reviewedAt: serverTime(),
                        reviewedBy: S.user.uid
                    });

                if (v === "approved") {
                    await firestore.collection("reports")
                        .doc(String(r.id))
                        .update({
                            status: "claim_pending"
                        });
                }

                if (v === "rejected") {
                    await firestore.collection("reports")
                        .doc(String(r.id))
                        .update({
                            status: "open"
                        });
                }

            } else if (k === "m") {

                await firestore.collection("reports")
                    .doc(String(r.id))
                    .update({
                        status: "returned",
                        returnedAt: serverTime()
                    });

                await firestore.collection("claims")
                    .doc(String(id))
                    .update({
                        status: "returned"
                    });
            }
        }

        toast("Updated successfully!");

    } catch (error) {
        console.error("Admin update error:", error);
        alert("Unable to update this record. Check your permissions.");
    }
}


/* =====================================================
   16. APPLICATION SHELL AND NAVIGATION
====================================================== */

var TITLES = {
    feed: "CampusFind",
    post: "New report",
    mine: "My activity",
    admin: "Admin review",
    detail: "Item details",
    claim: "Claim item"
};

function draw(keepFocus) {
    var a = $("app");
    var v = S.view;

    if (!S.authReady) {
        a.innerHTML = `
            <div class="loading">
                <h2>CampusFind</h2>
                <p>Loading your account...</p>
            </div>
        `;
        return;
    }

    if (!S.user) {
        a.innerHTML = vLogin();
        return;
    }

    if (v === "admin" && !S.user.admin) {
        S.view = "feed";
        v = "feed";
    }

    var sub = v === "detail" || v === "claim";

    var pos = document.activeElement &&
        document.activeElement.id;

    var st = pos &&
        document.activeElement.selectionStart;

    var renderer = {
        feed: vFeed,
        post: vPost,
        mine: vMine,
        admin: vAdmin,
        detail: vDetail,
        claim: vClaim
    }[v];

    if (!renderer) {
        S.view = "feed";
        v = "feed";
        renderer = vFeed;
    }

    var body = renderer();

    var nav = [
        ["feed", "🔎", "Browse"],
        ["post", "➕", "Post"],
        ["mine", "👤", "Mine"]
    ];

    if (S.user.admin) {
        nav.push(["admin", "🛡️", "Admin"]);
    }

    a.innerHTML = `
        <header>

            ${sub
                ? `<button
                    onclick="go('${v === "claim" ? "detail" : "feed"}')"
                    aria-label="Back">←</button>`
                : ""
            }

            <h1>${TITLES[v]}</h1>

            <button
                onclick="logout()"
                aria-label="Log out"
                style="font-size:13px;
                    border:1px solid rgba(255,255,255,.5);
                    border-radius:6px;
                    padding:4px 9px">
                Log out
            </button>

        </header>

        <main id="mn">
            ${body}
        </main>

        <nav>
            ${nav.map(function(n) {
                return `
                    <button class="${v === n[0] ? "on" : ""}"
                        onclick="setNav('${n[0]}')">
                        <b>${n[1]}</b>
                        ${n[2]}
                    </button>
                `;
            }).join("")}
        </nav>
    `;

    if (v === "post") {
        Object.keys(draft).forEach(function(k) {
            if ($(k) && draft[k] != null) {
                $(k).value = draft[k];
            }
        });
    }

    if (keepFocus && pos && $(pos)) {
        $(pos).focus();

        try {
            $(pos).setSelectionRange(st, st);
        } catch (e) {}
    }
}


/* (Firebase Auth State Listener now lives in auth.js) */


/* =====================================================
   18. EVENT LISTENERS
====================================================== */

document.addEventListener("change", function(e) {
    if (S.view === "post") {
        keep();
    }
});

document.addEventListener("input", function(e) {
    if (S.view === "post") {
        keep();
    }
});

document.addEventListener("deviceready", function() {
    // Cordova device initialization can be added here.
}, false);


/* =====================================================
   19. INITIALIZE APPLICATION
====================================================== */

draw();
