resource "aws_db_instance" "default" {
  allocated_storage    = 10
  db_name              = "mydb"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  username             = "admin"
  password             = "admin123"
  skip_final_snapshot  = true
  db_subnet_group_name = aws_db_subnet_group.default.name

}
output "db-endpoint" {
  value = aws_db_instance.default.endpoint
}


resource "aws_db_subnet_group" "default" {
  name       = "main"
  subnet_ids = module.vpc.public_subnet_ids

  tags = {
    Name = "My DB subnet group"
  }
}
output "db-subnet-group" {
  value = aws_db_subnet_group.default.name
}