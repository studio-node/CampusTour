variable "aws_region" {
  type        = string
  description = "AWS region for staging resources"
  default     = "us-east-1"
}

variable "name_prefix" {
  type        = string
  description = "Prefix used for naming/tagging resources"
  default     = "campustour-staging"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type (free-tier friendly)"
  default     = "t3.micro"
}

variable "key_name" {
  type        = string
  description = "AWS key pair name"
  default     = "campustour-staging"
}

variable "public_key_path" {
  type        = string
  description = "Path to an existing SSH public key (e.g. ~/.ssh/id_ed25519.pub)"
}

variable "ssh_ingress_cidr" {
  type        = string
  description = "CIDR allowed to SSH to the instance (e.g. 1.2.3.4/32)"
}

