package com.ems.dto;

import com.ems.model.LeaveBalance;

public record LeaveBalanceResponse(Long id, int year, String leaveType, int allocatedDays, int usedDays, int remainingDays) {
    public LeaveBalanceResponse(LeaveBalance b) {
        this(b.getId(), b.getYear(), b.getLeaveType(), b.getAllocatedDays(), b.getUsedDays(), b.getRemainingDays());
    }
}
