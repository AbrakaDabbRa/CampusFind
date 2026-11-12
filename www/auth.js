/* =====================================================
   auth.js - SCHOOL EMAIL ACCOUNTS (Firebase)

   Replaces in your Firebase index.html:
     section 7  (doAuth, logout)
     section 8  (vLogin)
     section 17 (auth.onAuthStateChanged ... )
   Keep: firebase config, `auth`, `firestore`, `serverTime`,
         S, db, draw, esc, $, toast,
         startDataListeners, stopDataListeners.

   Load this file LAST (after everything it uses).
====================================================== */


/* ---------- 1. SETTINGS ---------- */

// Student emails use @my.xu.edu.ph, staff/admin use @xu.edu.ph
var EMAIL_DOMAINS = ["@my.xu.edu.ph", "@xu.edu.ph"];

// true  = a new account must click the link in the verification
//         email before it can use the app (admins are exempt, so
//         hand-made admin accounts without a real inbox still work)
// false = skip verification (only for quick testing)
var REQUIRE_VERIFIED_EMAIL = true;

var authBusy = false;


/* ---------- 2. VALIDATION ---------- */

// Accepts name@my.xu.edu.ph and name@xu.edu.ph only.
// Rejects "@xu.edu.ph" alone, "a@b@xu.edu.ph", other domains.
function isSchoolEmail(email) {
    email = String(email || "").trim().toLowerCase();

    return EMAIL_DOMAINS.some(function(d) {
        return email.length > d.length &&
            email.endsWith(d) &&
            email.indexOf("@") === email.length - d.length;
    });
}

function authMessage(error) {
    var messages = {
        "auth/email-already-in-use":
            "This email is already registered. Try logging in.",
        "auth/invalid-email":
            "Please enter a valid email address.",
        "auth/weak-password":
            "Your password must be at least 6 characters.",
        "auth/user-not-found":
            "Incorrect email or password.",
        "auth/wrong-password":
            "Incorrect email or password.",
        "auth/invalid-credential":
            "Incorrect email or password.",
        "auth/user-disabled":
            "This account has been disabled. Contact an admin.",
        "auth/too-many-requests":
            "Too many attempts. Please wait a few minutes and try again.",
        "auth/network-request-failed":
            "Network error. Check your internet connection.",
        "auth/operation-not-supported-in-this-environment":
            "Open the app through Live Server or the installed app, not as a plain file."
    };

    return messages[error && error.code] ||
        "Something went wrong. Please try again.";
}


/* ---------- 3. SCREENS ---------- */

function vLogin() {
    if (S.view === "verify") {
        return vVerify();
    }

    return `
        <div class="hero">
            <i></i>
            <h1>CampusFind</h1>
            <p>Lost something on campus? Found something? Post it here.</p>
        </div>

        <main>
            <div class="card">

                ${S.reg ? `
                    <label>Full name</label>
                    <input id="nm"
                        autocomplete="name"
                        maxlength="60"
                        placeholder="Enter your full name">
                ` : ""}

                <label>School email</label>
                <input id="em"
                    type="email"
                    placeholder="name@my.xu.edu.ph"
                    autocomplete="email">

                <label>Password</label>
                <input id="pw"
                    type="password"
                    autocomplete="${S.reg ? "new-password" : "current-password"}">

                <div class="err" id="er"></div>

                <button class="btn" id="authBtn" onclick="doAuth()">
                    ${S.reg ? "Create account" : "Log in"}
                </button>

                ${!S.reg ? `
                    <p class="meta" style="margin-top:12px;text-align:center">
                        <a href="#" onclick="resetPassword();return false"
                            style="color:var(--navy);font-weight:600">
                            Forgot password?
                        </a>
                    </p>
                ` : ""}

                <p class="meta" style="margin-top:8px;text-align:center">
                    ${S.reg ? "Have an account? " : "New here? "}
                    <a href="#" onclick="S.reg=!S.reg;draw();return false"
                        style="color:var(--navy);font-weight:600">
                        ${S.reg ? "Log in" : "Create account"}
                    </a>
                </p>
            </div>
        </main>
    `;
}

function vVerify() {
    return `
        <div class="hero">
            <i></i>
            <h1>Verify your email</h1>
            <p>We sent a link to ${esc(S.verifyEmail)}.</p>
        </div>

        <main>
            <div class="card">
                <p style="margin-bottom:10px">
                    Open the email, tap the link, then come back here and
                    press the button below. Check your spam folder too.
                </p>

                <div class="err" id="er"></div>

                <button class="btn" onclick="checkVerified()">
                    I've verified my email
                </button>

                <button class="btn ghost" style="margin-top:8px"
                    onclick="resendVerification()">
                    Resend email
                </button>

                <button class="btn ghost" style="margin-top:8px"
                    onclick="logout()">
                    Log out
                </button>
            </div>
        </main>
    `;
}


/* ---------- 4. REGISTER / LOG IN ---------- */

async function doAuth() {
    if (authBusy) return;

    var e = $("em").value.trim().toLowerCase();
    var p = $("pw").value;
    var er = $("er");

    er.textContent = "";

    if (!isSchoolEmail(e)) {
        er.textContent =
            "Use your school email (name@my.xu.edu.ph or name@xu.edu.ph).";
        return;
    }

    if (p.length < 6 || !/\S/.test(p)) {
        er.textContent = "Password must be at least 6 characters.";
        return;
    }

    var name = "";

    if (S.reg) {
        name = $("nm").value.trim();

        if (name.length < 2) {
            er.textContent = "Please enter your full name.";
            return;
        }
    }

    authBusy = true;
    var btn = $("authBtn");
    if (btn) btn.disabled = true;

    try {
        if (S.reg) {
            // The profile document is created in loadSession(),
            // which reads this name.
            S.pendingName = name;

            var credential =
                await auth.createUserWithEmailAndPassword(e, p);

            try {
                await credential.user.updateProfile({ displayName: name });
                await credential.user.sendEmailVerification();
                toast("Account created. Check your email to verify it.");
            } catch (mailError) {
                console.error("Verification email error:", mailError);
                toast("Account created, but the email could not be sent. Tap Resend.");
            }

            S.reg = false;

        } else {
            await auth.signInWithEmailAndPassword(e, p);
        }

    } catch (error) {
        console.error("Authentication error:", error);
        S.pendingName = "";

        var er2 = $("er");
        if (er2) er2.textContent = authMessage(error);

    } finally {
        authBusy = false;
        var btn2 = $("authBtn");
        if (btn2) btn2.disabled = false;
    }
}

async function resetPassword() {
    var e = $("em").value.trim().toLowerCase();
    var er = $("er");

    er.textContent = "";

    if (!isSchoolEmail(e)) {
        er.textContent = "Enter your school email above first.";
        return;
    }

    try {
        await auth.sendPasswordResetEmail(e);
    } catch (error) {
        if (error.code !== "auth/user-not-found") {
            er.textContent = authMessage(error);
            return;
        }
    }

    // Same message whether or not the account exists
    toast("If an account exists, a reset link was sent.");
}


/*Email verification*/

async function resendVerification() {
    var user = auth.currentUser;
    var er = $("er");

    if (!user) return;

    try {
        await user.sendEmailVerification();
        toast("Verification email sent.");
    } catch (error) {
        console.error("Resend error:", error);
        if (er) er.textContent = authMessage(error);
    }
}

async function checkVerified() {
    var user = auth.currentUser;
    var er = $("er");

    if (!user) return;

    try {
        await user.reload();           // pull the latest verified status
        await user.getIdToken(true);   // refresh the token so Firestore rules see email_verified = true
    } catch (error) {
        console.error("Reload error:", error);
        if (er) er.textContent = authMessage(error);
        return;
    }

    if (auth.currentUser.emailVerified) {
        await loadSession(auth.currentUser);
    } else if (er) {
        er.textContent =
        "Not verified yet. Tap the link in the email, then try again.";
    }
}


/* LOG OUT feature */

async function logout() {
    try {
        stopDataListeners();
        await auth.signOut();
        toast("Logged out successfully.");
    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to log out. Please try again.");
    }
}


/* ---------- 7. SESSION (runs after every login) ---------- */

async function loadSession(firebaseUser) {
    try {
        //Firebase accepts any new email made so this is to check the XU email requirements
        if (!isSchoolEmail(firebaseUser.email)) {
        await auth.signOut();
        alert("Only school email accounts can use CampusFind.");
        return;
        }

        var userRef = firestore.collection("users").doc(firebaseUser.uid);
        var userDoc = await userRef.get();
        if (!userDoc.exists) {
        await userRef.set({
        name: S.pendingName ||
        firebaseUser.displayName ||
        firebaseUser.email.split("@")[0],
        email: firebaseUser.email,
        admin: false,
        createdAt: serverTime()
        });

            userDoc = await userRef.get();
        }

        S.pendingName = "";

        var profile = userDoc.data();
        var isAdmin = profile.admin === true;

        //Unverified students wait on the verify screen
        if (REQUIRE_VERIFIED_EMAIL &&
        !firebaseUser.emailVerified &&
        !isAdmin) {
        stopDataListeners();
        S.user = null;
        S.verifyEmail = firebaseUser.email;
        S.view = "verify";
        S.authReady = true;

        draw();
        return;
        }

        S.user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: profile.name || firebaseUser.email.split("@")[0],
            admin: isAdmin
        };

        S.verifyEmail = "";
        S.view = "feed";
        S.authReady = true;

        startDataListeners();
        draw();

    } catch (error) {
        console.error("Failed to load user profile:", error);

    S.user = null;
    S.authReady = true;
    draw();

    alert(
        "Unable to load your account profile. " +
        "Please check your connection and try again."
        );

    await auth.signOut();
    }
}

auth.onAuthStateChanged(async function(firebaseUser) {
    if (!firebaseUser) {
        stopDataListeners();

        S.user = null;
        S.verifyEmail = "";
        S.view = "login";
        S.authReady = true;

        draw();
        return;
    }

    await loadSession(firebaseUser);
});