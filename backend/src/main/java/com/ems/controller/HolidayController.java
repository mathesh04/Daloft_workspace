package com.ems.controller;

import com.ems.model.OrganizationHoliday;
import com.ems.service.HolidayService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import com.ems.service.SystemSettingsService;
import java.util.*;

@RestController
@RequestMapping("/api/admin/holidays")
public class HolidayController {
    private final HolidayService service; private final SystemSettingsService settings;
    public HolidayController(HolidayService service,SystemSettingsService settings){this.service=service;this.settings=settings;}

    @GetMapping
    public List<OrganizationHoliday> list(@RequestParam(required=false) Integer year,
                                           @RequestParam(defaultValue="false") boolean includeInactive){
        int requestedYear=year==null?settings.today().getYear():year;
        return service.byYear(requestedYear, !includeInactive);
    }

    @GetMapping("/check")
    public Map<String,Object> check(@RequestParam String date){
        LocalDate d=LocalDate.parse(date); return Map.of("date",d,"holiday",service.isHoliday(d),"workingDay",service.isWorkingDay(d));
    }


    @GetMapping(value="/export", produces="text/csv")
    public ResponseEntity<String> export(@RequestParam int year){
        StringBuilder out=new StringBuilder("Date,Holiday,Type,Status,Description\n");
        for(OrganizationHoliday h: service.byYear(year,false)){
            out.append(csv(h.getHolidayDate())).append(',')
               .append(csv(h.getName())).append(',')
               .append(csv(h.getType())).append(',')
               .append(csv(h.isActive()?"ACTIVE":"INACTIVE")).append(',')
               .append(csv(h.getDescription())).append('\n');
        }
        return ResponseEntity.ok().header("Content-Disposition","attachment; filename=holiday-calendar-"+year+".csv").body(out.toString());
    }
    private String csv(Object value){String s=String.valueOf(value==null?"":value);return "\"" + s.replace("\"", "\"\"") + "\"";}

    @PostMapping
    public ResponseEntity<?> create(@RequestBody OrganizationHoliday holiday, Authentication auth){
        try{return ResponseEntity.status(201).body(service.create(holiday,auth));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,@RequestBody OrganizationHoliday holiday,Authentication auth){
        try{return ResponseEntity.ok(service.update(id,holiday,auth));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> status(@PathVariable Long id,@RequestBody Map<String,Boolean> body,Authentication auth){
        try{return ResponseEntity.ok(service.setActive(id,Boolean.TRUE.equals(body.get("active")),auth));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,Authentication auth){
        try{service.delete(id,auth);return ResponseEntity.ok(Map.of("message","Holiday deleted"));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }
}
