variable "aws_region" {
  type        = string
  description = "AWS region to deploy into."
  default     = "us-east-1"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for staging."
  default     = "t3.small"
}

variable "ssh_key_name" {
  type        = string
  description = "Existing EC2 key pair name for SSH."
}

variable "allowed_ssh_cidr" {
  type        = string
  description = "CIDR allowed to SSH to the instance (your IP)."
}

variable "app_name" {
  type        = string
  description = "Name prefix for AWS resources."
  default     = "campus-tour-staging"
}

