-- Migration: Add mobile_package column to payments table
-- This tracks which mobile package (XXL, XL, L, M, S) was selected for mobile package purchases

ALTER TABLE payments ADD COLUMN mobile_package VARCHAR(10) DEFAULT NULL;
