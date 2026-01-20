drop table if exists logs;
drop table if exists auto;
drop table if exists owners;

create table auto (
    id serial primary key,
    owner int references owners(id) on delete cascade,
    make varchar(50) not null,
    model varchar(50) not null,
    km_stand int not null,
    year int not null,
    vin varchar(17) unique not null,
    created_at timestamp default current_timestamp
);

create table logs (
    id serial primary key,
    auto_id int references auto(id) on delete cascade,
    geschwindigkeit int not null,
    rpm int not null,
    coolant_temp int not null,
    fuel_level int not null,
    gps_latitude float not null,
    gps_longitude float not null,
    timestamp timestamp default current_timestamp
);

create table owners (
    id serial primary key,
    name varchar(100) not null,
    email varchar(100) unique not null,
    phone varchar(15),
    created_at timestamp default current_timestamp
);

create index idx_auto_owner on auto(owner);
create index idx_logs_auto_id on logs(auto_id);
