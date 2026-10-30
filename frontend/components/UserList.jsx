export default function UserList({ users }) {
  if (users.length === 0) return <p>No users yet.</p>

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>
          {u.details ? `${u.details.first_name} ${u.details.last_name}`.trim() : u.username} (@{u.username}) — {u.email}
        </li>
      ))}
    </ul>
  )
}
