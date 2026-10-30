"""Create a user who can log in.

Usage:
    docker compose exec backend python -m scripts.create_user \
        --email a@b.c --username admin --first-name Ada --last-name Admin --role admin

Prompts for the password (getpass) so it never lands in shell history.
"""

import argparse
import getpass
import sys

from pydantic import ValidationError

from database import SessionLocal
from user import service
from user.schemas import UserCreate


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--email", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--birthdate", help="YYYY-MM-DD")
    parser.add_argument("--role", choices=["user", "admin"], default="user")
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Confirm password: "):
        print("Passwords do not match", file=sys.stderr)
        return 1

    try:
        data = UserCreate(
            email=args.email,
            username=args.username,
            password=password,
            first_name=args.first_name,
            last_name=args.last_name,
            birthdate=args.birthdate,
        )
    except ValidationError as e:
        print(e, file=sys.stderr)
        return 1

    with SessionLocal() as db:
        if service.email_or_username_taken(db, data.email, data.username):
            print(f"Email {data.email} or username {data.username} already exists", file=sys.stderr)
            return 1
        user = service.create_user(db, data, role=args.role)
    print(f"Created {user.role} {user.id} <{user.email}>")
    return 0


if __name__ == "__main__":
    sys.exit(main())
