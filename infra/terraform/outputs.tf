output "instance_id" {
  value = aws_instance.staging.id
}

output "public_ip" {
  value = aws_eip.staging.public_ip
}

output "ssh_user" {
  value = "ubuntu"
}

