# Firebase Security Rules for LifelineBD

Share this with your teammate to set up in Firebase Console.

## Installation Steps for Your Teammate

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your LifelineBD project
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace all content with the rules below
5. Click **Publish**

---

## Firebase Firestore Rules

Copy everything below and paste into Firebase Console:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth.uid != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // ========== EMERGENCY SERVICES ==========
    // Public read - anyone can see emergency services
    // Admin write - only admins can add/update/delete
    match /emergency-services/{serviceType}/{serviceId} {
      allow read: if true;  // Public - anyone can view
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Alternative flat structure (pick one approach)
    match /services/{serviceId} {
      allow read: if true;  // Public - anyone can view services
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // ========== ALERTS ==========
    match /alerts/{alertId} {
      allow read: if true;  // Public alerts
      allow create: if isAdmin() || request.auth.uid != null;  // Authenticated users can report
      allow update: if isAdmin() || isOwner(resource.data.createdBy);
      allow delete: if isAdmin();
    }
    
    // ========== USER DATA ==========
    // User profiles - private
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // User locations - private
    match /user-locations/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId);
    }
    
    // ========== INCIDENT REPORTS ==========
    match /incidents/{incidentId} {
      allow read: if isAuthenticated() || isAdmin();
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // ========== NEWS ==========
    match /news/{newsId} {
      allow read: if true;  // Public news
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // ========== ADMIN COLLECTION ==========
    match /admins/{userId} {
      allow read: if isAdmin();
      allow write: if false;  // Never allow direct writes - must be done by Firebase admin
    }
    
    // ========== FIRE DISPATCH STATUS ==========
    match /fire-dispatch/{dispatchId} {
      allow read: if true;  // Public visibility
      allow create: if isAuthenticated();  // Authenticated users can create dispatches
      allow update: if isAdmin() || isOwner(resource.data.uid);
      allow delete: if isAdmin();
    }

    // ========== NOTIFICATIONS ==========
    match /notifications/{notificationId} {
      allow read: if isAdmin() || isOwner(resource.data.uid);
      allow create: if isAdmin() || isAuthenticated();
      allow update: if isAdmin() || isOwner(resource.data.uid);
      allow delete: if isAdmin();
    }

    // ========== WOMEN SAFETY PANIC MODE ==========
    match /panic-alerts/{alertId} {
      allow read: if isAdmin() || isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // ========== LIVE MONITORING CENTER DATA ==========
    match /monitoring/{documentId} {
      allow read: if true;  // Public dashboard stats
      allow write: if isAdmin();
    }
    
    // ========== CATCH ALL - DENY BY DEFAULT ==========
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Firestore Collection Structure to Create

Your teammate should create these collections in Firestore (or your app will auto-create them):

### 1. **emergency-services** (or **services**)
```
/services/
  ├── dhaka-med-1 (document)
  │   ├── id: "dhaka-med-1"
  │   ├── name: "Dhaka Medical College Hospital"
  │   ├── type: "hospital"
  │   ├── address: "Kala Bagan, Dhaka"
  │   ├── phone: "+88001700000001"
  │   ├── coords: { latitude: 23.7344, longitude: 90.3692 }
  │   ├── rating: 4.7
  │   ├── openStatus: "Open"
  │   ├── createdBy: "admin-uid"
  │   └── updatedAt: (timestamp)
  │
  └── police-ramna-1 (document)
      ├── name: "Ramna Police Station"
      ├── type: "police"
      ├── coords: { latitude: 23.7273, longitude: 90.4168 }
      └── ... (same fields)
```

### 2. **admins** (For access control)
```
/admins/
  └── admin-user-id (document)
      └── isAdmin: true
```

---

## Testing the Rules

After publishing, your teammate can test in Firebase Console:

1. Go to **Firestore Database** → **Rules** → **Rules Playground**
2. Test scenarios:
   - ✅ **Anyone can read** `/services/dhaka-med-1`
   - ❌ **Non-admin cannot create** `/services/new-service`
   - ✅ **Admin can create/update** `/services/new-service`
   - ✅ **User can create** `/incidents/incident-1`
   - ❌ **User cannot delete** other user's incidents

---

## Important Notes for Your Teammate

⚠️ **Security Checklist:**
- [ ] These rules allow **public read** of emergency services (intentional - users need to see them)
- [ ] **Write access is restricted** to admins only (secure)
- [ ] Private data (user locations, panic alerts) are user-only or admin
- [ ] Default rule is **DENY** for any collection not explicitly allowed
- [ ] **Catch-all rule** at the end blocks undefined paths

💡 **Tips:**
- To add/update emergency services: Use Firebase Admin SDK (server-side)
- Don't give users direct write access to emergency services (prevents spam/vandalism)
- Test rules in the **Rules Playground** before publishing
- Monitor rules violations in **Firestore** → **Rules** → **Logs** tab

---

## Future Enhancements (Optional)

If you scale up, consider:

1. **Rate Limiting** - Add to prevent abuse:
```javascript
allow create: if isAuthenticated() && 
             request.time < resource.data.timestamp + duration.value(60, 's');
```

2. **Geo-hashing** - Add geohash field to services for better querying:
```
geohash: "u4prb"  // Efficiently find nearby services
```

3. **Backup Collection** - Archive old incidents:
```
match /incidents-archive/{year}/{month}/{incidentId} {
  allow read: if isAdmin();
  allow write: if false;  // Cloud Function only
}
```

---

## Admin Setup (One-time)

Your teammate needs to add admins using Firebase Admin SDK (from server/cloud function):

```javascript
// Example: Add user as admin
admin.firestore().collection('admins').doc('user-uid-here').set({
  isAdmin: true,
  addedAt: admin.firestore.FieldValue.serverTimestamp(),
  addedBy: 'setup-admin'
});
```

Or use Firebase Console → **Firestore** → Add document manually to `/admins/` collection.

---

## Questions?

If rules deployment fails or conflicts arise:
1. Check that all collections exist in Firestore
2. Verify user is authenticated (except for public reads)
3. Check Firestore **Logs** tab for detailed error messages
4. Test individual rules in **Rules Playground**
