#!/bin/bash
set -e

if [ ! -s "$PGDATA/PG_VERSION" ]; then
    rm -rf "$PGDATA"/*

    until pg_basebackup -h postgres -U replicator -D "$PGDATA" -Fp -Xs -P -R; do
        echo "Waiting for primary..."
        sleep 2
    done

    echo "primary_conninfo = 'host=postgres port=5432 user=replicator password=replicator_pass'" >> "$PGDATA/postgresql.auto.conf"
    touch "$PGDATA/standby.signal"
    chown -R postgres:postgres "$PGDATA"
fi

exec docker-entrypoint.sh postgres -c hot_standby=on
