package com.ems.controller;

import com.ems.model.Attendance;
import com.ems.model.Component;
import com.ems.repository.AttendanceRepository;
import com.ems.repository.ComponentRepository;
import com.ems.repository.LeaveRequestRepository;
import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Table;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;
@RestController @RequestMapping("/api/admin/reports") public class ReportController {
 private final AttendanceRepository attendance; private final LeaveRequestRepository leaves; private final ComponentRepository components;
 public ReportController(AttendanceRepository a,LeaveRequestRepository l,ComponentRepository c){attendance=a;leaves=l;components=c;}
 private List<Attendance> rows(Integer month,Integer year){return attendance.findAllByOrderByWorkDateDescCheckInTimeDesc().stream().filter(a->(month==null||a.getWorkDate().getMonthValue()==month)&&(year==null||a.getWorkDate().getYear()==year)).toList();}
 @GetMapping(value="/attendance", produces="text/csv") public ResponseEntity<byte[]> attendanceCsv(@RequestParam(required=false) Integer month,@RequestParam(required=false) Integer year){StringBuilder s=new StringBuilder("Employee ID,Employee,Date,Check In,Check Out,Status,Working Minutes,Overtime Minutes\n");for(Attendance a:rows(month,year))s.append(csv(a.getEmployee().getEmployeeId())).append(',').append(csv(a.getEmployee().getName())).append(',').append(a.getWorkDate()).append(',').append(a.getCheckInTime()).append(',').append(a.getCheckOutTime()).append(',').append(a.getStatus()).append(',').append(a.getWorkingMinutes()).append(',').append(a.getOvertimeMinutes()).append('\n');return download(s.toString().getBytes(),"attendance-report.csv","text/csv");}
 @GetMapping("/attendance/excel") public ResponseEntity<byte[]> attendanceExcel(@RequestParam(required=false) Integer month,@RequestParam(required=false) Integer year)throws Exception{try(XSSFWorkbook wb=new XSSFWorkbook();ByteArrayOutputStream out=new ByteArrayOutputStream()){XSSFSheet sh=wb.createSheet("Attendance");String[] h={"Employee ID","Employee","Date","Check In","Check Out","Status","Working Minutes","Overtime Minutes"};XSSFRow hr=sh.createRow(0);for(int i=0;i<h.length;i++)hr.createCell(i).setCellValue(h[i]);int r=1;for(Attendance a:rows(month,year)){XSSFRow row=sh.createRow(r++);String[] v={a.getEmployee().getEmployeeId(),a.getEmployee().getName(),String.valueOf(a.getWorkDate()),String.valueOf(a.getCheckInTime()),String.valueOf(a.getCheckOutTime()),String.valueOf(a.getStatus()),String.valueOf(a.getWorkingMinutes()),String.valueOf(a.getOvertimeMinutes())};for(int i=0;i<v.length;i++)row.createCell(i).setCellValue(v[i]);}for(int i=0;i<h.length;i++)sh.autoSizeColumn(i);wb.write(out);return download(out.toByteArray(),"attendance-report.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");}}
 @GetMapping("/attendance/pdf") public ResponseEntity<byte[]> attendancePdf(@RequestParam(required=false) Integer month,@RequestParam(required=false) Integer year)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();Document d=new Document(PageSize.A4.rotate());PdfWriter.getInstance(d,out);d.open();d.add(new Paragraph("EMS Attendance Report",FontFactory.getFont(FontFactory.HELVETICA_BOLD,18)));d.add(new Paragraph("Generated: "+LocalDateTime.now()));Table table=new Table(6);table.addCell("Employee");table.addCell("Date");table.addCell("Check In");table.addCell("Check Out");table.addCell("Status");table.addCell("Working / OT");for(Attendance a:rows(month,year)){table.addCell(a.getEmployee().getName());table.addCell(String.valueOf(a.getWorkDate()));table.addCell(String.valueOf(a.getCheckInTime()));table.addCell(String.valueOf(a.getCheckOutTime()));table.addCell(String.valueOf(a.getStatus()));table.addCell((a.getWorkingMinutes()==null?0:a.getWorkingMinutes())+" / "+(a.getOvertimeMinutes()==null?0:a.getOvertimeMinutes())+" min");}d.add(table);d.close();return download(out.toByteArray(),"attendance-report.pdf","application/pdf");}


 @GetMapping(value="/leave",produces="text/csv")
 public ResponseEntity<byte[]> leaveCsv(@RequestParam(required=false) Integer month,@RequestParam(required=false) Integer year){
  StringBuilder s=new StringBuilder("Employee ID,Employee,Type,Start Date,End Date,Working Days,Status,Reason,Rejection Reason\n");
  for(com.ems.model.LeaveRequest l:leaves.findAll()){
   if(l.getStartDate()==null)continue;
   if(month!=null&&l.getStartDate().getMonthValue()!=month)continue;
   if(year!=null&&l.getStartDate().getYear()!=year)continue;
   s.append(csv(l.getEmployee().getEmployeeId())).append(',').append(csv(l.getEmployee().getName())).append(',').append(csv(l.getLeaveType())).append(',')
    .append(csv(l.getStartDate())).append(',').append(csv(l.getEndDate())).append(',').append(l.getWorkingDays()).append(',')
    .append(csv(l.getStatus())).append(',').append(csv(l.getReason())).append(',').append(csv(l.getRejectionReason())).append('\n');
  }
  return download(s.toString().getBytes(),"leave-report.csv","text/csv");
 }
 @GetMapping(value="/inventory",produces="text/csv") 
 public ResponseEntity<byte[]> inventoryCsv(){
  StringBuilder s=new StringBuilder("Code,Item,Category,Current Quantity,Minimum Quantity,Location\n");
  for(Component c:components.findAll())s.append(csv(c.getComponentCode())).append(',').append(csv(c.getName())).append(',').append(csv(c.getCategory()==null?"":c.getCategory().getName())).append(',').append(c.getCurrentQuantity()).append(',').append(c.getMinimumQuantity()).append(',').append(csv(c.getStorageLocation())).append('\n');return download(s.toString().getBytes(),"inventory-report.csv","text/csv");}
 private ResponseEntity<byte[]> download(byte[] b,String n,String type){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+n+"\"").contentType(MediaType.parseMediaType(type)).body(b);} private String csv(Object value){String s=String.valueOf(value==null?"":value);return "\"" + s.replace("\"", "\"\"") + "\"";}
}