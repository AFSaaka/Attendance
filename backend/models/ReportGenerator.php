<?php
require_once __DIR__ . '/../vendor/autoload.php';

class ReportGenerator extends TCPDF {
    private $meta;

    public function __construct($meta) {
        // 'L' for Landscape, 'mm' for millimeters, 'A4' size
        parent::__construct('L', 'mm', 'A4', true, 'UTF-8', false);
        $this->meta = $meta;
        $this->SetAutoPageBreak(true, 15);
        $this->setPrintHeader(false);
        $this->setPrintFooter(false);
        $this->SetMargins(10, 10, 10); // Standardize margins
    }

    public function generateWeekPage($weekNumber, $students) {
        $this->AddPage();
        
        // 1. Branding Header
        $this->SetFont('helvetica', 'B', 14);
        $this->Cell(0, 7, 'UNIVERSITY FOR DEVELOPMENT STUDIES', 0, 1, 'C');
        $this->SetFont('helvetica', 'B', 11);
        $this->Cell(0, 5, 'DIRECTORATE OF COMMUNITY RELATIONS AND OUTREACH PROGRAMMES (DCROP)', 0, 1, 'C');
        // Ensure session_desc exists to avoid notices
        $desc = $this->meta['session_desc'] ?? '---';
        $this->Cell(0, 5, "{$desc} THIRD TRIMESTER FIELD PRACTICAL PROGRAMME", 0, 1, 'C');
        $this->Cell(0, 5, "ATTENDANCE SHEET FOR " . ($this->meta['level'] ?? 'STUDENTS'), 0, 1, 'C');
        $this->Ln(4);

        // 2. Metadata Grid
        $this->SetFont('helvetica', '', 10);
        $this->Cell(50, 7, "Region: " . ($this->meta['region'] ?? 'N/A'), 1);
        $this->Cell(70, 7, "District/Municipality: " . ($this->meta['district'] ?? 'N/A'), 1);
        $this->Cell(90, 7, "Community: " . ($this->meta['community_name'] ?? 'N/A'), 1);
        $this->Cell(67, 7, "Week: " . $this->getWeekWord($weekNumber), 1);
        $this->Ln();

        // 3. Table Header
        $this->SetFont('helvetica', 'B', 9);
        $this->SetFillColor(245, 245, 245);
        
        $this->Cell(10, 12, 'S/N', 1, 0, 'C', 1);
        $this->Cell(30, 12, 'Index Number', 1, 0, 'C', 1);
        $this->Cell(70, 12, "Candidate's Name", 1, 0, 'C', 1);

        // Generate Dates for columns
        $startStr = $this->meta['start_date'] ?? date('Y-m-d');
        $startDate = new DateTime($startStr);
        $startDate->modify("+" . (($weekNumber - 1) * 7) . " days");
        
        $columnWidth = 21; 
        $headerX = $this->GetX();
        $headerY = $this->GetY();

        $this->Cell($columnWidth * 7, 6, 'Date/Status', 1, 0, 'C', 1);
        $this->Cell(16, 12, 'Score', 1, 1, 'C', 1);
        
        $this->SetXY($headerX, $headerY + 6);
        $this->SetFont('helvetica', '', 8);
        for ($i = 0; $i < 7; $i++) {
            $currentDate = clone $startDate;
            $currentDate->modify("+$i days");
            $this->Cell($columnWidth, 6, $currentDate->format('d/m/Y'), 1, 0, 'C', 1);
        }
        $this->Ln(6);

        // 4. Student Rows
        $this->SetFont('helvetica', '', 9);
        $sn = 1;
        foreach ($students as $student) {
            // Check if we need a new page before drawing the row
            if ($this->GetY() > 180) { 
                $this->AddPage();
                // (Note: In production, you'd re-draw the table header here)
            }

            $this->Cell(10, 8, $sn++, 1, 0, 'C');
            $this->Cell(30, 8, $student['index_number'], 1, 0, 'C');
            
            // Handle long names by reducing font size if necessary
            $name = $student['full_name'];
            $fontSize = (strlen($name) > 30) ? 7 : 9;
            $this->SetFont('helvetica', '', $fontSize);
            $this->Cell(70, 8, $name, 1, 0, 'L');
            $this->SetFont('helvetica', '', 9);
            
            $weekPresentCount = 0;
            for ($d = 1; $d <= 7; $d++) {
                $status = $student['attendance'][$weekNumber][$d] ?? null;
                
                if ($status === 'present') {
                    $text = 'Present'; // FIXED TYPO
                    $weekPresentCount++;
                    $this->SetTextColor(0, 100, 0); // Dark Green for visibility
                } elseif ($status === 'absent') {
                    $text = 'Absent';
                    $this->SetTextColor(150, 0, 0); // Red
                } else {
                    $text = '-'; // Not recorded
                    $this->SetTextColor(0, 0, 0);
                }
                
                $this->Cell($columnWidth, 8, $text, 1, 0, 'C');
                $this->SetTextColor(0, 0, 0); // Reset color
            }
            $this->Cell(16, 8, $weekPresentCount, 1, 1, 'C');
        }
    }

    private function getWeekWord($n) {
        $words = [1 => "One", 2 => "Two", 3 => "Three", 4 => "Four", 5 => "Five", 6 => "Six", 7 => "Seven", 8 => "Eight"];
        return $words[$n] ?? $n;
    }
}