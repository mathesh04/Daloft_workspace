package com.ems.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.Employee;
import com.ems.model.LeaveBalance;
import com.ems.model.LeaveRequest;
import com.ems.repository.LeaveBalanceRepository;

@Service
public class LeaveBalanceService {
    private final LeaveBalanceRepository balances;
    private final SystemSettingsService settings;
    public LeaveBalanceService(LeaveBalanceRepository b,SystemSettingsService s){balances=b;settings=s;}

    private int allocation(String type){
        return switch(type){
            case "CASUAL" -> settings.getInt("LEAVE_CASUAL_DAYS",12);
            case "SICK" -> settings.getInt("LEAVE_SICK_DAYS",12);
            case "EARNED" -> settings.getInt("LEAVE_EARNED_DAYS",15);
            default -> 0; 
        };
    }

    @Transactional
    public LeaveBalance ensure(Employee e,String type,int year){
        type=type.toUpperCase(Locale.ROOT);
        String t=type;
        return balances.findByEmployeeIdAndYearAndLeaveType(e.getId(),year,t).orElseGet(()->{
            LeaveBalance b=new LeaveBalance(); b.setEmployee(e);b.setYear(year);b.setLeaveType(t);b.setAllocatedDays(allocation(t));b.setUsedDays(0);return balances.save(b);
        });
    }

    public List<LeaveBalance> mine(Employee e,int year){
        List<String> types=List.of("CASUAL","SICK","EARNED","UNPAID","WORK_FROM_HOME","OTHER");
        for(String t:types) ensure(e,t,year);
        return balances.findByEmployeeIdAndYearOrderByLeaveTypeAsc(e.getId(),year);
    }

    @Transactional
    public void reserveOnApproval(LeaveRequest r){
        if(r.isBalanceApplied() || !consumes(r.getLeaveType())) return;
        LeaveBalance b=balances.findForUpdate(r.getEmployee().getId(),r.getStartDate().getYear(),r.getLeaveType().toUpperCase(Locale.ROOT))
                .orElseGet(()->ensure(r.getEmployee(),r.getLeaveType(),r.getStartDate().getYear()));
        if(b.getRemainingDays()<r.getWorkingDays()) throw new IllegalArgumentException(
                "Insufficient "+r.getLeaveType()+" leave balance. Remaining: "+b.getRemainingDays()+" working days.");
        b.setUsedDays(b.getUsedDays()+r.getWorkingDays()); balances.save(b); r.setBalanceApplied(true);
    }

    @Transactional
    public void releaseOnReversal(LeaveRequest r){
        if(!r.isBalanceApplied() || !consumes(r.getLeaveType())) return;
        LeaveBalance b=balances.findForUpdate(r.getEmployee().getId(),r.getStartDate().getYear(),r.getLeaveType().toUpperCase(Locale.ROOT))
                .orElseGet(()->ensure(r.getEmployee(),r.getLeaveType(),r.getStartDate().getYear()));
        b.setUsedDays(Math.max(0,b.getUsedDays()-r.getWorkingDays())); balances.save(b); r.setBalanceApplied(false);
    }

    public boolean consumes(String type){return Set.of("CASUAL","SICK","EARNED").contains(String.valueOf(type).toUpperCase(Locale.ROOT));}
}
