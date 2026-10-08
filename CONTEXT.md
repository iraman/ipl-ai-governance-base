# WorkRide

The office shuttle between metro and office, and the bookings employees hold on it.

## Language

**Employee**:
A person who signs in with Trimble ID and books the shuttle for themselves.
_Avoid_: User, rider

**Admin**:
An employee who may view a day’s bookings, tag a vehicle on each booking, and mark no-shows.
_Avoid_: Operator, dispatcher

**Slot**:
One of the four fixed departures on a date: 7:30, 8:30, 5:00, or 6:00.
_Avoid_: Trip, run

**Booking**:
An employee’s hold on one slot on one date. One per employee per date.
_Avoid_: Reservation

**Vehicle**:
The shuttle an admin tags on a booking.
_Avoid_: Run assignment

**No-show**:
A booking an admin marks when the employee does not ride.
_Avoid_: Cancellation

**Booking block**:
The day after two consecutive no-shows, during which the employee can sign in and cannot book.
_Avoid_: Ban, suspension
