-- Update action items to be visible for all users
UPDATE public.action_items
SET assigned_to = 'b80103f3-c5be-4f9c-a173-59fdcb1d3160'::uuid,
    created_by = 'b80103f3-c5be-4f9c-a173-59fdcb1d3160'::uuid
WHERE assigned_to = '9be5c2e0-30af-4761-aff7-b752cf3cb7bf'::uuid;