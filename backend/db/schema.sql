-- Erstelle Tabellen nur wenn sie nicht existieren (für Persistenz)

create table if not exists owners (
    id serial primary key,
    name varchar(100) not null,
    email varchar(100) unique not null,
    phone varchar(15),
    created_at timestamp default current_timestamp
);

create table if not exists auto (
    id serial primary key,
    owner int references owners(id) on delete cascade,
    make varchar(50) not null,
    model varchar(50) not null,
    km_stand int not null,
    year int not null,
    vin varchar(17) unique not null,
    created_at timestamp default current_timestamp
);

-- 1-Sekunden-Durchschnitte für schnelle Werte
create table if not exists logs_1sec (
    id serial primary key,
    auto_id int references auto(id) on delete cascade,
    geschwindigkeit real not null,
    rpm real not null,
    timestamp timestamp default current_timestamp
);

-- 10-Sekunden-Durchschnitte für langsam ändernde Werte
create table if not exists logs_10sec (
    id serial primary key,
    auto_id int references auto(id) on delete cascade,
    coolant_temp real not null,
    oil_temp real not null,
    fuel_level real not null,
    voltage real not null,
    boost real not null,
    oil_pressure real not null,
    timestamp timestamp default current_timestamp
);

-- Erstelle Indexes nur wenn sie nicht existieren
create index if not exists idx_auto_owner on auto(owner);
create index if not exists idx_logs_1sec_auto_id on logs_1sec(auto_id);
create index if not exists idx_logs_10sec_auto_id on logs_10sec(auto_id);

create index idx_auto_owner on auto(owner);
create index idx_logs_1sec_auto_id on logs_1sec(auto_id);
create index idx_logs_10sec_auto_id on logs_10sec(auto_id);
