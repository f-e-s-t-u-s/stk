-- datbase to store transaction details after user makes a successful payment
CREATE TABLE Transactions(
    transaction_id int primary key auto_increment,
    transaction_receipt varchar(255) not null,
    transaction_amount int not null,
    transaction_date varchar(255) not null,
    transaction_phone_number varchar(255) not null
);