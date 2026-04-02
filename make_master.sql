-- Make srinath8789@gmail.com a Master user

INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, raw_user_meta_data->>'full_name', 'Master'
FROM auth.users
WHERE email = 'srinath8789@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'Master';
