# Security Specification

## Data Invariants
1. A Trip belongs to a specific user (userId must match request.auth.uid).
2. A Moment belongs to a specific Trip (tripId must link to a valid trip).
3. A Moment's userId must match the creator's ID.
4. Only the owner of a Trip can update or delete it.
5. Only the owner of a Moment can update or delete it.

## The "Dirty Dozen" Payloads
1. Create a trip with someone else's user ID.
2. Edit a trip that belongs to another user.
3. Add a ghost field ("isAdmin") to a trip during creation.
4. Set createdAt to a timestamp other than request.time.
5. Create a moment with a non-existent trip ID.
6. Create a moment with a trip ID belonging to another user.
7. Set a string over the size limit for trip name.
8. Add an item array of images over the max limit.
9. Delete a moment that belongs to another user.
10. Update a moment with wrong timestamp.
11. Perform a ghost update on moment date without it tracking.
12. Inject long tripId for moment creation.
