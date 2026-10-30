"""Change an existing user's role, e.g. to promote the first admin.

Usage:
    docker compose exec backend python -m scripts.set_role --email a@b.c --role admin
"""
import argparse
import sys

from database import SessionLocal
from user import service


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", choices=["user", "admin"], required=True)
    args = parser.parse_args()

    with SessionLocal() as db:
        user = service.get_user_by_email(db, args.email)
        if user is None:
            print(f"No user with email {args.email}", file=sys.stderr)
            return 1
        user.role = args.role
        db.commit()
    print(f"{args.email} is now {args.role}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
