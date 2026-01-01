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
    }

    public function generateWeekPage($weekNumber, $students) {
        $this->AddPage();
        
        // 1. Branding Header
        $this->SetFont('helvetica', 'B', 14);
        $this->Cell(0, 7, 'UNIVERSITY FOR DEVELOPMENT STUDIES', 0, 1, 'C');
        $this->SetFont('helvetica', 'B', 11);
        $this->Cell(0, 5, 'DIRECTORATE OF COMMUNITY RELATIONS AND OUTREACH PROGRAMMES (DCROP)', 0, 1, 'C');
        $this->Cell(0, 5, "{$this->meta['session_desc']} THIRD TRIMESTER FIELD PRACTICAL PROGRAMME", 0, 1, 'C');
        $this->Cell(0, 5, "ATTENDANCE SHEET FOR {$this->meta['student_level']}", 0, 1, 'C');
        $this->Ln(4);

        // 2. Metadata Grid
        $this->SetFont('helvetica', '', 10);
        $this->SetFillColor(255, 255, 255);
        $this->Cell(50, 7, "Region: " . $this->meta['region'], 1);
        $this->Cell(70, 7, "District/Municipality: " . $this->meta['district'], 1);
        $this->Cell(90, 7, "Community: " . $this->meta['community_name'], 1);
        $this->Cell(67, 7, "Week: " . $this->getWeekWord($weekNumber), 1);
        $this->Ln();

        // 3. Table Header
        $this->SetFont('helvetica', 'B', 9);
        $this->SetFillColor(245, 245, 245);
        
        $this->Cell(10, 12, 'S/N', 1, 0, 'C', 1);
        $this->Cell(30, 12, 'Index Number', 1, 0, 'C', 1);
        $this->Cell(70, 12, "Candidate's Name", 1, 0, 'C', 1);

        // Generate Dates for columns
        $startDate = new DateTime($this->meta['start_date']);
        $startDate->modify("+" . (($weekNumber - 1) * 7) . " days");
        
        $columnWidth = 21; // Width for each day column
        $headerX = $this->GetX();
        $headerY = $this->GetY();

        // Sub-header for Date/Signature
        $this->Cell($columnWidth * 7, 6, 'Date/Signature', 1, 0, 'C', 1);
        $this->Cell(16, 12, 'Score', 1, 1, 'C', 1);
        
        // Return to sub-header Y to draw specific dates
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
            $this->Cell(10, 8, $sn++, 1, 0, 'C');
            $this->Cell(30, 8, $student['uin'], 1, 0, 'C');
            $this->Cell(70, 8, $student['full_name'], 1, 0, 'L');
            
            $weekPresentCount = 0;
            // Draw 7 empty boxes for signing, or fill if data exists
            for ($d = 1; $d <= 7; $d++) {
                $status = $student['attendance'][$weekNumber][$d] ?? '';
                $text = ($status === 'present') ? 'P' : '';
                if($status === 'present') $weekPresentCount++;
                
                $this->Cell($columnWidth, 8, $text, 1, 0, 'C');
            }
            $this->Cell(16, 8, $weekPresentCount, 1, 1, 'C');
        }
    }

    private function getWeekWord($n) {
        $words = [1 => "One", 2 => "Two", 3 => "Three", 4 => "Four", 5 => "Five", 6 => "Six", 7 => "Seven", 8 => "Eight"];
        return $words[$n] ?? $n;
    }
}