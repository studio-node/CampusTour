output "public_ip" {
  description = "Public IP of the staging instance"
  value       = aws_instance.staging.public_ip
}

output "ssh_command" {
  description = "Convenience SSH command"
  value       = "ssh -i <your_private_key> ubuntu@${aws_instance.staging.public_ip}"
}

output "ansible_inventory_snippet" {
  description = "Convenience inventory line for infra/ansible/inventory.ini"
  value       = "staging ansible_host=${aws_instance.staging.public_ip} ansible_user=ubuntu ansible_ssh_private_key_file=<path_to_private_key>"
}

