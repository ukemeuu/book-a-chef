# Availability System Logic: ChefNyumbani

## 1. `availability_slots` Table Structure
As defined in the initial PostgreSQL schema:
```sql
CREATE TABLE public.availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);
```

## 2. Preventing Overlapping Bookings

To prevent a chef from being double-booked for intersecting time slots, we rely on **PostgreSQL Exclusion Constraints** utilizing the `btree_gist` extension. This prevents overlaps at the database level regardless of race conditions on the Node.js/Next.js edge.

**SQL Database Constraint (Must be run in Supabase SQL Editor):**
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.availability_slots
ADD CONSTRAINT no_overlapping_slots
EXCLUDE USING GIST (
    chef_id WITH =,
    tstzrange(start_time, end_time) WITH &&
) WHERE (is_booked = TRUE); 
-- Only enforce this rule if the slot is actually booked. 
-- A chef can have overlapping *available* slots in complex setups, but not overlapping *booked* events.
```

## 3. Example Server Action for Checking & Booking a Slot
In a Next.js Server Action (`bookChef.ts`), you can perform a transactional check:

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'

export async function checkAndBookSlot(chefId: string, eventStartTime: string, eventEndTime: string, customerId: string, menuId: string) {
  const supabase = createClient()
  
  // 1. Transactional check & lock. In Supabase, you can call an RPC.
  // Alternatively, using standard JS querying:
  const { data: conflicts, error: conflictError } = await supabase
    .from('availability_slots')
    .select('id')
    .eq('chef_id', chefId)
    .eq('is_booked', true)
    // Supabase allows calling PostgREST range filters here, or simply checking manually if time bounds are strictly enforced.
    // For absolute safety, relying on the PostgreSQL EXCLUDE constraint created above ensures the INSERT will throw an error if overlapping.
    
  // 2. Attempt Insert. If it overlaps, the DB constraint will throw a 23P01 (exclusion_violation)
  const { data: newSlot, error: insertError } = await supabase
    .from('availability_slots')
    .insert({
        chef_id: chefId,
        start_time: eventStartTime,
        end_time: eventEndTime,
        is_booked: true
    })
    .select()

  if (insertError) {
      if (insertError.code === '23P01') {
          return { error: 'This chef is already booked for this specific time slot.' }
      }
      return { error: 'Failed to secure booking slot.' }
  }
  
  // 3. Proceed to create the actual Booking record...
}
```

## 4. Edge Cases Explained

### Edge Case A: "Same Day Multiple Bookings"
*Scenario:* A chef accepts a lunch event (12:00 PM - 3:00 PM) and a dinner event (7:00 PM - 10:00 PM) on the same day.
*Handling:* Because we use `TIMESTAMPTZ` ranges, the database looks at the exact timestamps. The times `[12:00, 15:00]` and `[19:00, 22:00]` do not intersect (`&&` operator). Both inserts succeed.
*UX Considerations:* We might need a buffer constraint (e.g., minimum 2 hours between events). This can easily be added in the server action logic by checking: `targetStartTime < existingEndTime + 2_hours`.

### Edge Case B: "Cancellation Reopening Slots"
*Scenario:* A customer cancels a confirmed booking a week prior. 
*Handling:* 
1. The `bookings` row status is set to `cancelled`.
2. A Supabase Database Trigger fires on the `bookings` update. 
3. The trigger finds the associated `availability_slots` ID and flips `is_booked` from `TRUE` to `FALSE`.
4. Because the `EXCLUDE` constraint is `WHERE (is_booked = TRUE)`, this slot is immediately removed from the overlap calculation, throwing it back into the pool of open availability.
