package com.ems.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name="components", uniqueConstraints=@UniqueConstraint(columnNames="component_code"))
public class Component {
 @Id 
 @GeneratedValue(strategy=GenerationType.IDENTITY) 
 private Long id;

 @Version 
 @Column(nullable=false) 
 private Long version=0L;

 @Column(nullable=false) 
 private String name;

 @Column(name="component_code",nullable=false) 
 private String componentCode;

 @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="category_id",nullable=false) 
 private InventoryCategory category;
 private String manufacturer; 

 @Column(name="model_number") 
 private String modelNumber; 

 @Column(length=2000) 
 private String description;

 private String unit="pcs"; 

 @Column(name="current_quantity",nullable=false) 
 private Integer currentQuantity=0; 

 @Column(name="minimum_quantity",nullable=false) 
 private Integer minimumQuantity=0; 

 @Column(name="storage_location") 
 private String storageLocation;

 @Column(name="created_at",updatable=false) 
 private LocalDateTime createdAt=LocalDateTime.now(); 

 @Column(name="updated_at") 
 private LocalDateTime updatedAt=LocalDateTime.now();

 @PreUpdate 
 void updated(){
    updatedAt=LocalDateTime.now();
}
 public Long getId(){return id;} 
 public void setId(Long id){
    this.id=id;} 
 public Long getVersion(){
    return version;} 
    public void setVersion(Long v){version=v;}
     public String getName(){return name;} 
     public void setName(String v){name=v;} 
     public String getComponentCode(){return componentCode;} 
     public void setComponentCode(String v){componentCode=v;}
      public InventoryCategory getCategory(){return category;} 
      public void setCategory(InventoryCategory v){category=v;} 
      public String getManufacturer(){return manufacturer;} 
      public void setManufacturer(String v){manufacturer=v;} 
      public String getModelNumber(){return modelNumber;} 
      public void setModelNumber(String v){modelNumber=v;} 
      public String getDescription(){return description;} 
      public void setDescription(String v){description=v;}
       public String getUnit(){return unit;} 
       public void setUnit(String v){unit=v;} 
       public Integer getCurrentQuantity(){
        return currentQuantity;
    } 
    public void setCurrentQuantity(Integer v){
        currentQuantity=v;} 
        public Integer getMinimumQuantity(){
            return minimumQuantity;
        } 
        public void setMinimumQuantity(Integer v){
            minimumQuantity=v;
        } 
        public String getStorageLocation(){
            return storageLocation;}
             public void setStorageLocation(String v){
                storageLocation=v;
            } 
            public LocalDateTime getCreatedAt(){
                return createdAt;
            } 
            public LocalDateTime getUpdatedAt()
            {return updatedAt;}
}
